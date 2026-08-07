import express from 'express';
import bcrypt from 'bcryptjs';
import jwtPkg from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

const { sign } = jwtPkg;
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'printnear_secret_key_123';

// Register Customer or Shopkeeper
router.post('/register', async (req, res) => {
  try {
    const { 
      name, email, password, role, phone, 
      shopName, address, bwPerPage, colorPerPage, coordinates 
    } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({ 
      name, email, password: hashedPassword, role: role || 'customer', phone 
    });

    let shop = null;

    if (role === 'shopkeeper') {
      const shopCoords = (coordinates && Array.isArray(coordinates) && coordinates.length === 2)
        ? coordinates
        : [75.8577, 22.7196];

      shop = await Shop.create({
        ownerId: user._id,
        ownerName: name,
        shopName: shopName || `${name}'s Print Shop`,
        email,
        phone,
        address: address || 'Campus Main Road',
        location: {
          type: 'Point',
          coordinates: shopCoords
        },
        pricing: {
          bwPerPage: Number(bwPerPage) || 3,
          colorPerPage: Number(colorPerPage) || 10
        },
        discountTiers: [{ minPages: 10, bwRate: 0.80 }],
        isOpen: true
      });
    }

    const token = sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone,
        shopId: shop ? shop._id : null
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    let shopId = null;
    if (user.role === 'shopkeeper') {
      const shop = await Shop.findOne({ ownerId: user._id });
      if (shop) shopId = shop._id;
    }

    const token = sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone,
        shopId 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Profile
router.patch('/profile', async (req, res) => {
  try {
    const { userId, name, phone, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, phone, email },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;