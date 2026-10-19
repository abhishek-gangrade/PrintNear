/**
 * Multi-Factor Nearby Shop Recommendation Engine
 * Core Contribution #2: Multi-Factor Shop Recommendation
 * 
 * Scores and ranks shops based on distance, exact order price, active queue, and completion time.
 */

import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import { calculateAuthoritativeQuote } from './pricing.js';
import { predictOrderECT } from './ectPredictor.js';

export const recommendShops = async ({
  userLat,
  userLng,
  maxDistance = 5000,
  pages = 1,
  copies = 1,
  colorType = 'B&W',
  printSides = 'Single',
  paperSize = 'A4',
  binding = 'None',
  sortBy = 'best_match',
  weights = { distance: 0.30, price: 0.25, queue: 0.20, time: 0.25 }
}) => {
  const lat = Number(userLat);
  const lng = Number(userLng);
  const radius = Math.min(Number(maxDistance) || 5000, 25000);

  // 1. Geospatial Query for eligible shops within radius
  const candidateShops = await Shop.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: radius,
        spherical: true,
        query: {
          isOpen: true,
          status: { $in: ['active', null] }
        }
      }
    },
    { $limit: 30 }
  ]);

  if (!candidateShops || candidateShops.length === 0) {
    return [];
  }

  // 2. Fetch active order queues for all candidate shops in parallel
  const shopIds = candidateShops.map(s => s._id);
  const activeOrders = await Order.find({
    shopId: { $in: shopIds },
    status: { $in: ['Pending', 'Printing', 'Accepted', 'Queued'] }
  }).select('shopId pages copies colorType');

  // Group active workloads by shop
  const queueByShop = new Map();
  for (const o of activeOrders) {
    const sid = String(o.shopId);
    if (!queueByShop.has(sid)) {
      queueByShop.set(sid, { jobCount: 0, pagesCount: 0 });
    }
    const curr = queueByShop.get(sid);
    curr.jobCount += 1;
    curr.pagesCount += (o.pages || 1) * (o.copies || 1);
  }

  // 3. Compute exact price, queue length, and ECT for each shop
  const evaluatedShops = candidateShops.map(shop => {
    const sid = String(shop._id);
    const queue = queueByShop.get(sid) || { jobCount: 0, pagesCount: 0 };

    // A. Price Calculation for user's exact configuration
    const quote = calculateAuthoritativeQuote({
      shopPricing: shop.pricing || {},
      pages,
      copies,
      colorType,
      printSides,
      paperSize,
      binding
    });

    // B. Printer capabilities & ECT
    const onlinePrinters = (shop.printers || []).filter(p => p.isOnline !== false);
    const printerCount = Math.max(1, onlinePrinters.length);
    const avgPpm = onlinePrinters.length > 0
      ? Math.round(onlinePrinters.reduce((sum, p) => sum + (p.ppm || 25), 0) / onlinePrinters.length)
      : 25;

    const ect = predictOrderECT({
      pages,
      copies,
      colorType,
      printSides,
      binding,
      queuePagesAhead: queue.pagesCount,
      activeJobsAhead: queue.jobCount,
      availablePrinters: printerCount,
      avgPrinterPpm: avgPpm
    });

    return {
      shop,
      distanceMeters: Math.round(shop.distanceMeters),
      distanceKm: Number((shop.distanceMeters / 1000).toFixed(2)),
      estimatedPrice: quote.totalAmount,
      priceBreakdown: quote,
      activeJobsInQueue: queue.jobCount,
      queuePagesAhead: queue.pagesCount,
      estimatedMinutes: ect.estimatedMinutes,
      confidenceInterval: ect.confidenceInterval,
      printerCount,
      rating: shop.rating?.average || 4.8
    };
  });

  // 4. Determine Min & Max boundaries for normalization
  const minDistance = Math.min(...evaluatedShops.map(s => s.distanceMeters));
  const maxDistanceFound = Math.max(...evaluatedShops.map(s => s.distanceMeters), minDistance + 1);

  const minPrice = Math.min(...evaluatedShops.map(s => s.estimatedPrice));
  const maxPriceFound = Math.max(...evaluatedShops.map(s => s.estimatedPrice), minPrice + 1);

  const minQueue = Math.min(...evaluatedShops.map(s => s.activeJobsInQueue));
  const maxQueueFound = Math.max(...evaluatedShops.map(s => s.activeJobsInQueue), minQueue + 1);

  const minTime = Math.min(...evaluatedShops.map(s => s.estimatedMinutes));
  const maxTimeFound = Math.max(...evaluatedShops.map(s => s.estimatedMinutes), minTime + 1);

  // 5. Score each shop using normalized utility (lower is better, so utility = 1 - normalized)
  const scoredShops = evaluatedShops.map(item => {
    // Normalization scales: 1.0 = best possible in range, 0.0 = worst in range
    const normDist = 1 - ((item.distanceMeters - minDistance) / (maxDistanceFound - minDistance || 1));
    const normPrice = 1 - ((item.estimatedPrice - minPrice) / (maxPriceFound - minPrice || 1));
    const normQueue = 1 - ((item.activeJobsInQueue - minQueue) / (maxQueueFound - minQueue || 1));
    const normTime = 1 - ((item.estimatedMinutes - minTime) / (maxTimeFound - minTime || 1));

    // Weighted composite score (0 to 100)
    const compositeScore = Math.round(
      (weights.distance * normDist +
       weights.price * normPrice +
       weights.queue * normQueue +
       weights.time * normTime) * 100
    );

    // Dynamic explainability badges
    const highlightBadges = [];
    if (item.distanceMeters === minDistance) highlightBadges.push('📍 Closest to you');
    if (item.estimatedPrice === minPrice) highlightBadges.push(`🏷️ Lowest price (₹${item.estimatedPrice})`);
    if (item.estimatedMinutes === minTime) highlightBadges.push(`⚡ Fastest ETA (~${item.estimatedMinutes}m)`);
    if (item.activeJobsInQueue === 0) highlightBadges.push('🟢 Zero queue');
    if (item.printerCount > 1) highlightBadges.push(`🖨️ ${item.printerCount} Active Printers`);

    return {
      ...item.shop,
      distanceMeters: item.distanceMeters,
      distanceKm: item.distanceKm,
      estimatedPrice: item.estimatedPrice,
      priceBreakdown: item.priceBreakdown,
      activeJobsInQueue: item.activeJobsInQueue,
      queuePagesAhead: item.queuePagesAhead,
      estimatedMinutes: item.estimatedMinutes,
      confidenceInterval: item.confidenceInterval,
      recommendationScore: compositeScore,
      highlightBadges: highlightBadges.length > 0 ? highlightBadges : ['✓ Verified Campus Hub'],
      factorScores: {
        distanceScore: Math.round(normDist * 100),
        priceScore: Math.round(normPrice * 100),
        queueScore: Math.round(normQueue * 100),
        timeScore: Math.round(normTime * 100)
      }
    };
  });

  // 6. Sorting based on requested preference
  switch (sortBy) {
    case 'nearest':
      return scoredShops.sort((a, b) => a.distanceMeters - b.distanceMeters);
    case 'lowest_price':
      return scoredShops.sort((a, b) => a.estimatedPrice - b.estimatedPrice || a.distanceMeters - b.distanceMeters);
    case 'fastest':
      return scoredShops.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes || a.distanceMeters - b.distanceMeters);
    case 'best_match':
    default:
      return scoredShops.sort((a, b) => b.recommendationScore - a.recommendationScore || a.distanceMeters - b.distanceMeters);
  }
};

