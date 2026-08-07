import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import Order from '../models/Order.js';

export const deleteFileFromDisk = (fileUrl) => {
  if (!fileUrl) return;
  try {
    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`[Privacy Auto-Delete] Deleted: ${fullPath}`);
    }
  } catch (err) {
    console.error(`[Auto-Delete Error] Could not delete file ${fileUrl}:`, err.message);
  }
};

export const initFileCleanupJob = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldOrders = await Order.find({
        status: { $in: ['COMPLETED', 'CANCELLED'] },
        updatedAt: { $lt: cutoff }
      });

      let cleanedCount = 0;
      for (const ord of oldOrders) {
        if (ord.fileUrl) {
          deleteFileFromDisk(ord.fileUrl);
          ord.fileUrl = '';
        }
        if (ord.paymentScreenshotUrl) {
          deleteFileFromDisk(ord.paymentScreenshotUrl);
          ord.paymentScreenshotUrl = '';
        }
        await ord.save();
        cleanedCount++;
      }
      console.log(`[Midnight Privacy Job] Cleaned up files for ${cleanedCount} expired orders.`);
    } catch (err) {
      console.error('[Midnight Privacy Job Error]:', err.message);
    }
  });
};