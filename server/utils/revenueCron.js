import cron from 'node-cron';
import Shop from '../models/Shop.js';

export const initRevenueCron = () => {
  // Midnight Cron Job: Resets daily revenue counter at 12:00 AM every night
  cron.schedule('0 0 * * *', async () => {
    try {
      await Shop.updateMany({}, { todayRevenue: 0 });
      console.log('[Auto Revenue] Today\'s revenue counter reset for all print shops.');
    } catch (err) {
      console.error('[Auto Revenue Cron Error]:', err);
    }
  });
};