import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './utils/db.js';
import shopRoutes from './routes/shopRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { initFileCleanupJob } from './utils/cleanupJob.js';
import { initRevenueCron } from './utils/revenueCron.js';

initRevenueCron();

initFileCleanupJob();

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH']
  }
});

app.set('io', io);

// Socket.IO Chat & Real-Time Sync
io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  socket.on('join_order_chat', (orderId) => {
    socket.join(`order_${orderId}`);
  });

  socket.on('send_chat_message', ({ orderId, sender, message }) => {
    io.to(`order_${orderId}`).emit('receive_chat_message', {
      sender,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);

connectDB();

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`PrintNear server running on port ${PORT}`);
});