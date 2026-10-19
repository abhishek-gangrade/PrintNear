import express from 'express';
import Order from '../models/Order.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';
import { createGatewayOrder, verifyPaymentSignature, verifyWebhookSignature } from '../utils/paymentGateway.js';

const router = express.Router();

const emitOrderEvent = (req, event, order) => {
  const io = req.app.get('io');
  if (!io || !order) return;
  io.to(`order_${order._id}`).emit(event, order);
  io.to(`shop_${order.shopId}`).emit(event, order);
};

// 1. Create Gateway Payment Intent
router.post('/create-order', protect, allowRoles('customer'), async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden.' });

    if (order.paymentStatus === 'Verified') {
      return res.status(400).json({ message: 'Payment for this order has already been verified.' });
    }

    const gatewayOrder = await createGatewayOrder({
      amountInRupees: order.totalAmount,
      receipt: `ord_${order._id}`,
      notes: { orderId: String(order._id), userId: String(order.userId) }
    });

    order.paymentMethod = 'RAZORPAY';
    order.paymentDetails.razorpayOrderId = gatewayOrder.gatewayOrderId;
    await order.save();

    res.json(gatewayOrder);
  } catch (error) { next(error); }
});

// 2. Cryptographic Signature Verification
router.post('/verify', protect, allowRoles('customer'), async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden.' });

    const isValid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    if (!isValid) {
      return res.status(400).json({ message: 'Cryptographic signature verification failed.' });
    }

    order.paymentStatus = 'Verified';
    order.paymentDetails.razorpayPaymentId = razorpayPaymentId;
    order.paymentDetails.razorpaySignature = razorpaySignature;
    order.paymentDetails.paidAt = new Date();
    order.statusHistory.push({
      status: order.status,
      changedAt: new Date(),
      changedBy: req.user.name || 'PaymentGateway',
      note: `Payment verified via Razorpay (${razorpayPaymentId})`
    });

    await order.save();
    emitOrderEvent(req, 'PAYMENT_STATUS_UPDATED', order);
    res.json({ message: 'Payment successfully verified.', order });
  } catch (error) { next(error); }
});

// 3. Razorpay Asynchronous Webhook Receiver
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.body.toString('utf8');

    // If webhook secret configured, verify cryptographic signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody);
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.paymentStatus !== 'Verified') {
          order.paymentStatus = 'Verified';
          order.paymentDetails.razorpayPaymentId = payment.id;
          order.paymentDetails.paidAt = new Date();
          order.statusHistory.push({
            status: order.status,
            changedAt: new Date(),
            changedBy: 'RazorpayWebhook',
            note: `Payment captured asynchronously (${payment.id})`
          });
          await order.save();
          emitOrderEvent(req, 'PAYMENT_STATUS_UPDATED', order);
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Payment Webhook Error]', err.message);
    res.status(200).json({ status: 'ignored' });
  }
});

export default router;

