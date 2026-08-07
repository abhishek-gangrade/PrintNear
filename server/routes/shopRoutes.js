import express from 'express';
import Shop from '../models/Shop.js';

const router = express.Router();

// Get all active shops
router.get('/', async (req, res) => {
  try {
    const shops = await Shop.find({ isOpen: true });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update shop details, UPI ID, and dynamic discounts
router.patch('/:id', async (req, res) => {
  try {
    const { shopName, address, upiId, bwPerPage, colorPerPage, discountTiers, isOpen } = req.body;
    
    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      {
        shopName,
        address,
        upiId,
        pricing: { bwPerPage: Number(bwPerPage), colorPerPage: Number(colorPerPage) },
        discountTiers,
        isOpen
      },
      { new: true }
    );

    res.json(updatedShop);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;