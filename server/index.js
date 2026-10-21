import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import connectDB from './utils/db.js';
import Shop from './models/Shop.js';
import Order from './models/Order.js';
import Message from './models/Message.js';
import shopRoutes from './routes/shopRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { initFileCleanupJob } from './utils/cleanupJob.js';
import { initRevenueCron } from './utils/revenueCron.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret';

app.set('trust proxy', 1);

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// Environment-specific CORS configuration
const rawOrigins = CLIENT_URL.split(',').map(v => v.trim().replace(/\/+$/, '')).filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (rawOrigins.includes(cleanOrigin)) return true;
  try {
    const hostname = new URL(cleanOrigin).hostname;
    if (hostname.endsWith('.vercel.app')) return true;
  } catch {}
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy.'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Route-Specific Rate Limiters (In-Memory sliding window buckets)
const rateBuckets = new Map();
const createRateLimiter = (maxRequests = 300, windowMs = 15 * 60 * 1000) => (req, res, next) => {
  const key = `${req.ip}_${req.baseUrl || req.path}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now - bucket.start > windowMs) {
    rateBuckets.set(key, { start: now, count: 1 });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return res.status(429).json({ message: 'Too many requests. Please slow down and try again later.' });
  }
  next();
};

app.use('/api', createRateLimiter(400, 15 * 60 * 1000));
app.use('/api/auth/login', createRateLimiter(20, 15 * 60 * 1000));
app.use('/api/auth/register', createRateLimiter(15, 15 * 60 * 1000));

// Comprehensive Health & Dependency Status Endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    service: 'printnear-api',
    platform: 'Printania Hyperlocal Cloud',
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Mount Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO Authentication & Authorization
const getSocketUser = token => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { id: decoded.id, role: decoded.role };
  } catch { return null; }
};

const canJoinOrder = async (user, orderId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const order = await Order.findById(orderId).select('userId shopId');
  if (!order) return false;
  if (user.role === 'customer') return String(order.userId) === String(user.id);
  if (user.role === 'shopkeeper') return Boolean(await Shop.exists({ _id: order.shopId, ownerId: user.id }));
  return false;
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by Socket.IO CORS.'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});
app.set('io', io);

io.use((socket, next) => {
  const user = getSocketUser(socket.handshake.auth?.token);
  if (!user) return next(new Error('Unauthorized socket connection.'));
  socket.user = user;
  next();
});

io.on('connection', socket => {
  if (socket.user?.id) {
    socket.join(`user_${socket.user.id}`);
  }

  socket.on('join_order_chat', async orderId => {
    if (await canJoinOrder(socket.user, orderId)) socket.join(`order_${orderId}`);
  });

  socket.on('join_shop', async shopId => {
    if (
      (socket.user.role === 'shopkeeper' && await Shop.exists({ _id: shopId, ownerId: socket.user.id })) ||
      socket.user.role === 'admin'
    ) {
      socket.join(`shop_${shopId}`);
    }
  });

  socket.on('send_chat_message', async ({ orderId, message }) => {
    try {
      if (!(await canJoinOrder(socket.user, orderId))) return;
      const clean = String(message || '').trim().slice(0, 1000);
      if (!clean) return;
      const User = (await import('./models/User.js')).default;
      const user = await User.findById(socket.user.id).select('name role');
      if (!user) return;

      const saved = await Message.create({
        orderId,
        senderId: user._id,
        senderRole: user.role,
        senderName: user.name,
        message: clean
      });
      io.to(`order_${orderId}`).emit('receive_chat_message', saved);
    } catch (error) {
      socket.emit('chat_error', { message: 'Message could not be sent.' });
    }
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  if (err.name === 'MulterError' || err.message?.includes('Only PDF')) {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid request data or missing required fields.' });
  }
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message
  });
});

const start = async () => {
  if (process.env.NODE_ENV === 'production') {
    const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
  await connectDB();
  initRevenueCron();
  initFileCleanupJob();
  server.listen(PORT, () => console.log(`PrintNear/Printania API listening on port ${PORT}`));
};

start().catch(error => {
  console.error('Startup failed:', error);
  process.exit(1);
});