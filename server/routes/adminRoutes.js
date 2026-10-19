import express from 'express';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';
import { runRetentionCleanup } from '../utils/cleanupJob.js';

const router = express.Router();

// Enforce admin authorization on all admin routes
router.use(protect, allowRoles('admin'));

// 1. Platform Overview Metrics
router.get('/overview', async (req, res, next) => {
  try {
    const [totalUsers, totalShops, totalOrders, activeOrders, completedOrders] = await Promise.all([
      User.countDocuments(),
      Shop.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['Pending', 'Printing', 'Accepted', 'Queued', 'Ready'] } }),
      Order.countDocuments({ status: 'PickedUp' })
    ]);

    const revenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'Verified' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      metrics: {
        totalUsers,
        totalShops,
        totalOrders,
        activeOrders,
        completedOrders,
        totalRevenue
      },
      systemStatus: 'healthy',
      timestamp: new Date()
    });
  } catch (error) { next(error); }
});

// 2. Manage Shops
router.get('/shops', async (req, res, next) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });
    res.json(shops);
  } catch (error) { next(error); }
});

router.patch('/shops/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'pending_approval'].includes(status)) {
      return res.status(400).json({ message: 'Invalid shop status.' });
    }
    const shop = await Shop.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });
    res.json({ message: `Shop status updated to ${status}`, shop });
  } catch (error) { next(error); }
});

// 3. Manage Users
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(100);
    res.json(users);
  } catch (error) { next(error); }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid user status.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: `User status updated to ${status}`, user });
  } catch (error) { next(error); }
});

// 4. Privacy & Retention Statistics
router.get('/retention-stats', async (req, res, next) => {
  try {
    const [activeDocuments, deletedDocuments, pendingDeletion, failedDeletion] = await Promise.all([
      Order.countDocuments({ deletionStatus: 'Active', $or: [{ filePath: { $ne: '' } }, { filePublicId: { $ne: '' } }] }),
      Order.countDocuments({ deletionStatus: 'Deleted' }),
      Order.countDocuments({ documentRetentionExpiresAt: { $lte: new Date() }, deletionStatus: { $ne: 'Deleted' } }),
      Order.countDocuments({ deletionStatus: 'Failed' })
    ]);

    res.json({
      retentionPolicyHours: 2,
      activeDocuments,
      deletedDocuments,
      pendingDeletion,
      failedDeletion,
      timestamp: new Date()
    });
  } catch (error) { next(error); }
});

// 5. Trigger Immediate Retention Cleanup Run
router.post('/retention-run', async (req, res, next) => {
  try {
    const result = await runRetentionCleanup();
    res.json({ message: 'Retention cleanup completed.', ...result });
  } catch (error) { next(error); }
});

export default router;

