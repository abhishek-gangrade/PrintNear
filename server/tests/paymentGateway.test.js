import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { createGatewayOrder, verifyPaymentSignature } from '../utils/paymentGateway.js';

describe('Payment Gateway & Cryptographic Verification', () => {
  it('creates an authoritative gateway order with standard structure', async () => {
    const order = await createGatewayOrder({ amountInRupees: 75, receipt: 'test_order_1' });
    assert.ok(order.gatewayOrderId.startsWith('order_'));
    assert.strictEqual(order.amount, 7500); // Amount in paise
    assert.strictEqual(order.currency, 'INR');
  });

  it('verifies valid HMAC-SHA256 payment signature', () => {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'development-sandbox-secret';
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verified = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSig
    });
    assert.strictEqual(verified, true);
  });

  it('rejects tampered or forged payment signatures', () => {
    const verified = verifyPaymentSignature({
      razorpayOrderId: 'order_test_12345',
      razorpayPaymentId: 'pay_test_67890',
      razorpaySignature: 'tampered_fake_signature_hash'
    });
    assert.strictEqual(verified, false);
  });
});

