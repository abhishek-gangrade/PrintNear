import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateAuthoritativeQuote } from '../utils/pricing.js';

describe('Authoritative Pricing Engine', () => {
  const shopPricing = {
    bwPerPage: 2,
    colorPerPage: 10,
    duplexDiscountPercent: 20,
    stapleBindingPrice: 5,
    spiralBindingPrice: 30
  };

  it('calculates standard B&W single-sided order accurately', () => {
    const quote = calculateAuthoritativeQuote({
      shopPricing,
      pages: 10,
      copies: 1,
      colorType: 'B&W',
      printSides: 'Single'
    });
    // 10 pages * 1 copy * ₹2 = ₹20
    assert.strictEqual(quote.totalAmount, 20);
    assert.strictEqual(quote.printingCharges, 20);
    assert.strictEqual(quote.bindingCharges, 0);
  });

  it('calculates color printing charges', () => {
    const quote = calculateAuthoritativeQuote({
      shopPricing,
      pages: 5,
      copies: 1,
      colorType: 'Color',
      printSides: 'Single'
    });
    // 5 pages * 1 copy * ₹10 = ₹50
    assert.strictEqual(quote.totalAmount, 50);
  });

  it('applies duplex (double-sided) discount correctly', () => {
    const quote = calculateAuthoritativeQuote({
      shopPricing,
      pages: 20,
      copies: 1,
      colorType: 'B&W',
      printSides: 'Double'
    });
    // 20 impressions at ₹2 with 20% duplex discount = ₹2 * 0.80 * 20 = ₹32
    assert.strictEqual(quote.printingCharges, 32);
    assert.strictEqual(quote.duplexSavings, 8);
    assert.strictEqual(quote.totalAmount, 32);
  });

  it('adds finishing fees for spiral binding', () => {
    const quote = calculateAuthoritativeQuote({
      shopPricing,
      pages: 10,
      copies: 2,
      colorType: 'B&W',
      binding: 'Spiral'
    });
    // Printing: 10 * 2 * 2 = 40. Binding: 2 * 30 = 60. Subtotal: 100.
    assert.strictEqual(quote.bindingCharges, 60);
    assert.strictEqual(quote.subtotal, 100);
  });

  it('applies CAMPUS10 coupon code discount', () => {
    const quote = calculateAuthoritativeQuote({
      shopPricing,
      pages: 50,
      copies: 1,
      colorType: 'B&W',
      couponCode: 'CAMPUS10'
    });
    // Subtotal: 50 * 2 = 100. CAMPUS10 = 10% discount (-₹10) -> total: ₹90.
    assert.strictEqual(quote.couponDiscount, 10);
    assert.strictEqual(quote.totalAmount, 90);
  });
});

