import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import { predictOrderECT } from './ectPredictor.js';

export const calculateQueueInfo = async (shopId, targetOrderId) => {
  const activeOrders = await Order.find({
    shopId,
    status: { $in: ['Pending', 'Printing', 'Accepted', 'Queued'] }
  }).sort({ createdAt: 1 }).select('pages copies colorType printSides binding status createdAt');

  const shop = await Shop.findById(shopId).select('printers');
  const onlinePrinters = shop?.printers?.filter(p => p.isOnline !== false) || [];
  const availablePrinters = Math.max(1, onlinePrinters.length);
  const avgPrinterPpm = onlinePrinters.length > 0
    ? Math.round(onlinePrinters.reduce((sum, p) => sum + (p.ppm || 25), 0) / onlinePrinters.length)
    : 25;

  const targetIndex = activeOrders.findIndex(o => o._id.toString() === String(targetOrderId));
  if (targetIndex === -1) {
    return {
      queuePosition: 0,
      totalActiveInQueue: activeOrders.length,
      totalPagesAhead: 0,
      estimatedMinutes: 0,
      activeJobsAhead: 0,
      availablePrinters
    };
  }

  const targetOrder = activeOrders[targetIndex];
  const ordersAhead = activeOrders.slice(0, targetIndex);
  const totalPagesAhead = ordersAhead.reduce(
    (sum, o) => sum + (o.pages || 1) * (o.copies || 1),
    0
  );

  const prediction = predictOrderECT({
    pages: targetOrder.pages || 1,
    copies: targetOrder.copies || 1,
    colorType: targetOrder.colorType || 'B&W',
    printSides: targetOrder.printSides || 'Single',
    binding: targetOrder.binding || 'None',
    queuePagesAhead: totalPagesAhead,
    activeJobsAhead: ordersAhead.length,
    availablePrinters,
    avgPrinterPpm
  });

  return {
    queuePosition: targetIndex + 1,
    totalActiveInQueue: activeOrders.length,
    totalPagesAhead,
    activeJobsAhead: ordersAhead.length,
    estimatedMinutes: prediction.estimatedMinutes,
    confidenceInterval: prediction.confidenceInterval,
    predictorVersion: prediction.predictorVersion,
    availablePrinters
  };
};
