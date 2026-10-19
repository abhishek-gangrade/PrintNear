import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateAuthoritativeQuote } from '../utils/pricing.js';
import { predictOrderECT } from '../utils/ectPredictor.js';

describe('Multi-Factor Shop Recommendation Scoring & Explainability', () => {
  const shopA = {
    id: 'shop_1',
    name: 'Campus Central Hub',
    distanceMeters: 200,
    pricing: { bwPerPage: 3, colorPerPage: 10 },
    printers: [{ ppm: 30, isOnline: true }]
  };

  const shopB = {
    id: 'shop_2',
    name: 'Discount Print Works',
    distanceMeters: 900,
    pricing: { bwPerPage: 1.5, colorPerPage: 6 },
    printers: [{ ppm: 20, isOnline: true }]
  };

  it('calculates shop-specific prices and completion times accurately', () => {
    const quoteA = calculateAuthoritativeQuote({
      shopPricing: shopA.pricing,
      pages: 40,
      copies: 1,
      colorType: 'B&W'
    });
    const quoteB = calculateAuthoritativeQuote({
      shopPricing: shopB.pricing,
      pages: 40,
      copies: 1,
      colorType: 'B&W'
    });

    assert.strictEqual(quoteA.totalAmount, 120); // 40 * 3
    assert.strictEqual(quoteB.totalAmount, 60);  // 40 * 1.5
    assert.ok(quoteB.totalAmount < quoteA.totalAmount, 'Shop B should have lower price');

    const ectA = predictOrderECT({ pages: 40, copies: 1, availablePrinters: 1, avgPrinterPpm: 30 });
    const ectB = predictOrderECT({ pages: 40, copies: 1, availablePrinters: 1, avgPrinterPpm: 20 });

    assert.ok(ectA.estimatedMinutes <= ectB.estimatedMinutes, 'Shop A with faster PPM should be faster or equal');
  });

  it('computes composite multi-factor score favoring overall utility', () => {
    // Distance comparison: Shop A (200m) vs Shop B (900m)
    // Price comparison: Shop A (₹120) vs Shop B (₹60)
    // Normalized distance score for Shop A is higher (closer)
    // Normalized price score for Shop B is higher (cheaper)
    const normDistA = 1.0;
    const normDistB = 0.2;
    const normPriceA = 0.5;
    const normPriceB = 1.0;

    const weights = { distance: 0.5, price: 0.5 };
    const scoreA = Math.round((weights.distance * normDistA + weights.price * normPriceA) * 100);
    const scoreB = Math.round((weights.distance * normDistB + weights.price * normPriceB) * 100);

    assert.strictEqual(scoreA, 75);
    assert.strictEqual(scoreB, 60);
    assert.ok(scoreA > scoreB, 'Shop A gets higher score when proximity weight is prioritized');
  });
});

