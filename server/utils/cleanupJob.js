import cron from 'node-cron';
import Order from '../models/Order.js';
import { deleteDocument } from './fileStorage.js';

export const runRetentionCleanup = async () => {
  const now = new Date();
  const fallbackCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find orders where either the explicit retention deadline has elapsed,
  // or a completed/cancelled order has exceeded the fallback 24h cutoff.
  const expiredOrders = await Order.find({
    deletionStatus: { $ne: 'Deleted' },
    $or: [
      { documentRetentionExpiresAt: { $lte: now } },
      {
        status: { $in: ['PickedUp', 'Cancelled', 'Rejected'] },
        updatedAt: { $lt: fallbackCutoff }
      }
    ],
    $and: [
      { $or: [{ filePublicId: { $ne: '' } }, { filePath: { $ne: '' } }] }
    ]
  }).limit(100);

  let successCount = 0;
  let failureCount = 0;

  for (const order of expiredOrders) {
    try {
      const res = await deleteDocument(order);
      if (res.success) {
        order.filePublicId = '';
        order.filePath = '';
        order.deletionStatus = 'Deleted';
        order.documentDeletedAt = new Date();
        order.statusHistory.push({
          status: order.status,
          changedAt: new Date(),
          changedBy: 'PrivacyRetentionWorker',
          note: 'Stored document permanently deleted per privacy retention policy'
        });
        await order.save();
        successCount++;
      } else {
        order.deletionStatus = 'Failed';
        order.deletionRetryCount = (order.deletionRetryCount || 0) + 1;
        await order.save();
        failureCount++;
      }
    } catch (err) {
      console.error(`[Retention Cleanup] Failed to delete file for order ${order._id}:`, err.message);
      order.deletionStatus = 'Failed';
      order.deletionRetryCount = (order.deletionRetryCount || 0) + 1;
      await order.save();
      failureCount++;
    }
  }

  if (expiredOrders.length > 0) {
    console.log(`[Privacy Retention] Processed ${expiredOrders.length} expired documents: ${successCount} deleted, ${failureCount} failed.`);
  }

  return { processed: expiredOrders.length, successCount, failureCount };
};

export const initFileCleanupJob = () => {
  // Runs every 15 minutes to guarantee timely deletion within privacy SLAs
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runRetentionCleanup();
    } catch (error) {
      console.error('[Privacy Cleanup Job Error]', error.message);
    }
  });
};
