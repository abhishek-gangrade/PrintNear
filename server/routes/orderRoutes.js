import express from 'express';
import multer from 'multer';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import { deleteFileFromDisk } from '../utils/cleanupJob.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

router.get('/shop/all', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/shop/:shopId', async (req, res) => {
  try {
    const orders = await Order.find({ shopId: req.params.shopId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/create', upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'paymentScreenshot', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      shopId, customerName, customerPhone, pages, copies, printType, printSide
    } = req.body;

    if (!req.files || !req.files['document']) {
      return res.status(400).json({ message: "PDF Document file is required." });
    }

    const docFile = req.files['document'][0];
    const screenshotFile = req.files['paymentScreenshot'] ? req.files['paymentScreenshot'][0] : null;

    const numPages = Number(pages) || 1;
    const numCopies = Number(copies) || 1;
    let baseRate = printType === 'bw' ? 3 : 10;

    if (printSide === 'double') baseRate = baseRate * 0.85;
    const totalAmount = Math.max(1, Math.round(numPages * numCopies * baseRate));
    const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = await Order.create({
      shopId,
      customerName: customerName || 'Guest Customer',
      customerPhone: customerPhone || '9876543210',
      fileName: docFile.originalname,
      fileUrl: `/uploads/${docFile.filename}`,
      paymentScreenshotUrl: screenshotFile ? `/uploads/${screenshotFile.filename}` : '',
      pickupPin,
      pages: numPages,
      copies: numCopies,
      printType: printType || 'bw',
      printSide: printSide || 'single',
      totalAmount,
      status: 'PENDING'
    });

    const io = req.app.get('io');
    if (io) io.emit('NEW_ORDER', newOrder);

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, paymentVerified } = req.body;
    const orderBefore = await Order.findById(req.params.id);

    if (!orderBefore) return res.status(404).json({ message: 'Order not found' });

    const updateData = {};
    if (status) updateData.status = status;
    if (typeof paymentVerified === 'boolean') updateData.paymentVerified = paymentVerified;

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (status === 'COMPLETED' && orderBefore.status !== 'COMPLETED') {
      await Shop.findByIdAndUpdate(updatedOrder.shopId, {
        $inc: { 
          totalRevenue: updatedOrder.totalAmount || 0,
          todayRevenue: updatedOrder.totalAmount || 0
        }
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('ORDER_UPDATED', updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id/files', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.fileUrl) {
      deleteFileFromDisk(order.fileUrl);
      order.fileUrl = '';
    }
    if (order.paymentScreenshotUrl) {
      deleteFileFromDisk(order.paymentScreenshotUrl);
      order.paymentScreenshotUrl = '';
    }

    await order.save();

    const io = req.app.get('io');
    if (io) io.emit('ORDER_UPDATED', order);

    res.json({ message: 'Files permanently deleted for user privacy.', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;