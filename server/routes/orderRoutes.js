import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import Message from '../models/Message.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';
import { uploadDocument, getDocumentUrl, deleteDocument, streamLocalDocument, getSignedCloudinaryUrl } from '../utils/fileStorage.js';
import { calculateQueueInfo } from '../utils/queueCalculator.js';
import { inspectPdfBuffer } from '../utils/pdfInspector.js';
import { calculateAuthoritativeQuote } from '../utils/pricing.js';
import { predictOrderECT } from '../utils/ectPredictor.js';
import { createGatewayOrder, verifyPaymentSignature } from '../utils/paymentGateway.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]);
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (!allowed.has(file.mimetype) || !['pdf', 'doc', 'docx'].includes(ext)) {
      return cb(new Error('Only PDF, DOC and DOCX files are supported.'));
    }
    cb(null, true);
  }
});

const emitOrderEvent = (req, event, order) => {
  const io = req.app.get('io');
  if (!io || !order) return;
  io.to(`order_${order._id}`).emit(event, order);
  io.to(`shop_${order.shopId}`).emit(event, order);
  if (order.userId) io.to(`user_${order.userId}`).emit(event, order);
};

const serializeOrder = (order, includePin = false) => {
  const obj = order.toObject ? order.toObject() : { ...order };
  delete obj.filePath;
  delete obj.filePublicId;
  delete obj.fileResourceType;
  if (!includePin) delete obj.pickupPin;
  obj.documentUrl = getDocumentUrl(order);
  return obj;
};

const canAccessOrder = async (order, user) => {
  if (!order || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'customer') return String(order.userId) === String(user.id);
  if (user.role === 'shopkeeper') {
    const shop = await Shop.findOne({ _id: order.shopId, ownerId: user.id }).select('_id');
    return Boolean(shop);
  }
  return false;
};

// 1. Authoritative Quote Calculation Endpoint
router.post('/quote', async (req, res, next) => {
  try {
    const { shopId, pages, copies, colorType, printSides, paperSize, binding, couponCode } = req.body;
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found.' });

    const quote = calculateAuthoritativeQuote({
      shopPricing: shop.pricing || {},
      pages: Number(pages) || 1,
      copies: Number(copies) || 1,
      colorType: colorType || 'B&W',
      printSides: printSides || 'Single',
      paperSize: paperSize || 'A4',
      binding: binding || 'None',
      couponCode: couponCode || ''
    });

    res.json(quote);
  } catch (error) { next(error); }
});

// 2. Create Order with Server-Side Binary Page Count Inspection
router.post('/', protect, allowRoles('customer'), upload.single('file'), async (req, res, next) => {
  let uploaded = null;
  try {
    if (!req.file) return res.status(400).json({ message: 'A PDF, DOC or DOCX document is required.' });

    const {
      shopId, copies = 1, colorType = 'B&W', orientation = 'Portrait',
      printSides = 'Single', paperSize = 'A4', printQuality = 'Standard',
      pageRange = 'All', binding = 'None', customerNotes = '',
      couponCode = '', transactionUtr = '', paymentMethod = 'UPI_MANUAL'
    } = req.body;

    const shop = await Shop.findOne({ _id: shopId, isOpen: true });
    if (!shop) return res.status(404).json({ message: 'Print shop is currently unavailable.' });

    // Server-Side Document Inspection:
    // If the file is a PDF, parse the binary buffer to extract the authoritative page count.
    let authoritativePages = Number(req.body.pages) || 1;
    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const inspected = inspectPdfBuffer(req.file.buffer);
        authoritativePages = inspected.pageCount;
      } catch (inspectErr) {
        return res.status(400).json({ message: inspectErr.message });
      }
    }

    const copyCount = Math.max(1, parseInt(copies, 10) || 1);

    // Calculate Authoritative Price Quote
    const quote = calculateAuthoritativeQuote({
      shopPricing: shop.pricing || {},
      pages: authoritativePages,
      copies: copyCount,
      colorType,
      printSides,
      paperSize,
      binding,
      couponCode
    });

    // Estimate Completion Time (ECT)
    const activeShopOrders = await Order.find({
      shopId,
      status: { $in: ['Pending', 'Printing', 'Accepted', 'Queued'] }
    }).select('pages copies');

    const totalPagesAhead = activeShopOrders.reduce((sum, o) => sum + (o.pages || 1) * (o.copies || 1), 0);
    const onlinePrinters = (shop.printers || []).filter(p => p.isOnline !== false);
    const printerCount = Math.max(1, onlinePrinters.length);
    const avgPpm = onlinePrinters.length > 0
      ? Math.round(onlinePrinters.reduce((sum, p) => sum + (p.ppm || 25), 0) / onlinePrinters.length)
      : 25;

    const ect = predictOrderECT({
      pages: authoritativePages,
      copies: copyCount,
      colorType,
      printSides,
      binding,
      queuePagesAhead: totalPagesAhead,
      activeJobsAhead: activeShopOrders.length,
      availablePrinters: printerCount,
      avgPrinterPpm: avgPpm
    });

    uploaded = await uploadDocument(req.file);
    const pickupPin = crypto.randomInt(1000, 10000).toString();

    const order = await Order.create({
      userId: req.user.id,
      userName: req.user.name || 'Customer',
      shopId,
      filePath: uploaded.path,
      filePublicId: uploaded.publicId,
      fileResourceType: uploaded.resourceType,
      originalFileName: req.file.originalname,
      pages: authoritativePages,
      copies: copyCount,
      pageRange: String(pageRange || 'All').trim().slice(0, 50),
      paperSize,
      colorType,
      orientation,
      printSides,
      printQuality,
      binding,
      customerNotes: String(customerNotes).trim().slice(0, 1000),
      couponCode: quote.appliedCoupon ? quote.appliedCoupon.code : '',
      subtotal: quote.subtotal,
      discountAmount: quote.totalDiscount,
      totalAmount: quote.totalAmount,
      pricingSnapshot: {
        bwPerPage: shop.pricing?.bwPerPage || 3,
        colorPerPage: shop.pricing?.colorPerPage || 10,
        bindingFee: quote.bindingCharges,
        volumeDiscount: quote.volumeDiscount,
        duplexDiscount: quote.duplexSavings
      },
      paymentMethod,
      transactionUtr: String(transactionUtr).trim().slice(0, 80),
      paymentStatus: transactionUtr ? 'Submitted' : 'Pending',
      status: 'Pending',
      statusHistory: [
        {
          status: 'Pending',
          changedAt: new Date(),
          changedBy: req.user.name || 'Customer',
          note: 'Order submitted by customer'
        }
      ],
      queueInfo: {
        estimatedCompletionMinutes: ect.estimatedMinutes,
        predictionAlgorithm: ect.predictorVersion
      },
      pickupPin
    });

    emitOrderEvent(req, 'NEW_ORDER_RECEIVED', serializeOrder(order));
    res.status(201).json(serializeOrder(order, true));
  } catch (error) {
    if (uploaded) {
      try { await deleteDocument({ filePath: uploaded.path, filePublicId: uploaded.publicId, fileResourceType: uploaded.resourceType }); } catch {}
    }
    next(error);
  }
});

// 3. Customer Orders List
router.get('/user/:userId', protect, allowRoles('customer'), async (req, res, next) => {
  try {
    if (String(req.params.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden.' });
    const orders = await Order.find({ userId: req.user.id })
      .populate('shopId', 'shopName address upiId pricing location')
      .sort({ createdAt: -1 });
    res.json(orders.map(o => serializeOrder(o, true)));
  } catch (error) { next(error); }
});

// 4. Shopkeeper Orders List
router.get('/shop/:shopId', protect, allowRoles('shopkeeper'), async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.shopId, ownerId: req.user.id });
    if (!shop && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden.' });
    const orders = await Order.find({ shopId: req.params.shopId }).sort({ createdAt: -1 });
    res.json(orders.map(o => serializeOrder(o)));
  } catch (error) { next(error); }
});

// 5. Single Order Details
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('shopId', 'shopName address upiId pricing');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) return res.status(403).json({ message: 'Forbidden.' });
    const isCustomerOwner = String(order.userId) === String(req.user.id);
    res.json(serializeOrder(order, isCustomerOwner));
  } catch (error) { next(error); }
});

// 6. Authorized Document Streaming / Access Endpoint (Core Contribution #3)
router.get('/:id/document', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this document.' });
    }

    if (order.deletionStatus === 'Deleted' || (!order.filePath && !order.filePublicId)) {
      return res.status(410).json({ message: 'This document has been securely deleted in accordance with the retention policy.' });
    }

    // Cloudinary authenticated signed redirect
    if (order.filePublicId) {
      const signedUrl = getSignedCloudinaryUrl(order.filePublicId, order.fileResourceType);
      if (signedUrl) return res.redirect(signedUrl);
    }

    // Local Disk Streaming with security headers
    if (order.filePath) {
      const served = streamLocalDocument(order.filePath, res, order.originalFileName);
      if (!served) {
        return res.status(404).json({ message: 'Document file not found on server storage.' });
      }
      return;
    }

    res.status(404).json({ message: 'Document unavailable.' });
  } catch (error) { next(error); }
});

// 7. Queue Status & ECT Prediction
router.get('/:id/queue-status', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) return res.status(403).json({ message: 'Forbidden.' });
    const queueData = await calculateQueueInfo(order.shopId, order._id);
    res.json({ ...queueData, status: order.status });
  } catch (error) { next(error); }
});

// 8. Gateway Payment Intent Creation (Razorpay)
router.post('/:id/pay/razorpay-order', protect, allowRoles('customer'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden.' });

    if (order.paymentStatus === 'Verified') {
      return res.status(400).json({ message: 'Order payment is already finalized.' });
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

// 9. Gateway Payment Verification
router.post('/:id/pay/verify', protect, allowRoles('customer'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden.' });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const isValid = verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

    if (!isValid) {
      return res.status(400).json({ message: 'Payment verification failed: Invalid cryptographic signature.' });
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
    const payload = serializeOrder(order, true);
    emitOrderEvent(req, 'PAYMENT_STATUS_UPDATED', payload);
    res.json({ message: 'Payment verified successfully.', order: payload });
  } catch (error) { next(error); }
});

// 10. Manual UTR Payment Update (Shopkeeper Verification)
router.patch('/:id/payment', protect, allowRoles('shopkeeper'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) return res.status(403).json({ message: 'Forbidden.' });
    if (order.paymentStatus === 'Verified') {
      return res.status(400).json({ message: 'Payment is already finalized.' });
    }

    const { paymentStatus } = req.body;
    if (!['Verified', 'Rejected'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status.' });
    }

    order.paymentStatus = paymentStatus;
    order.statusHistory.push({
      status: order.status,
      changedAt: new Date(),
      changedBy: req.user.name || 'Shopkeeper',
      note: `Payment status marked as ${paymentStatus}`
    });

    await order.save();
    const payload = serializeOrder(order);
    emitOrderEvent(req, 'PAYMENT_STATUS_UPDATED', payload);
    res.json(payload);
  } catch (error) { next(error); }
});

// 11. Order Lifecycle Updates (FSM Transition Guard)
router.patch('/:id/status', protect, allowRoles('shopkeeper'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) return res.status(403).json({ message: 'Forbidden.' });

    const nextStatus = req.body.status;
    const allowed = {
      Pending: ['Accepted', 'Printing', 'Cancelled', 'Rejected'],
      Accepted: ['Queued', 'Printing', 'Cancelled', 'Rejected'],
      Queued: ['Printing', 'Cancelled'],
      Printing: ['Ready', 'Cancelled'],
      Ready: ['PickedUp'],
      PickedUp: [],
      Cancelled: [],
      Rejected: []
    };

    if (!allowed[order.status]?.includes(nextStatus)) {
      return res.status(400).json({ message: `Cannot transition order from '${order.status}' to '${nextStatus}'.` });
    }

    if (['Printing', 'Ready'].includes(nextStatus) && order.paymentStatus !== 'Verified' && order.paymentMethod !== 'CASH_ON_PICKUP') {
      return res.status(400).json({ message: 'Payment must be verified before printing or marking ready.' });
    }

    order.status = nextStatus;
    order.statusHistory.push({
      status: nextStatus,
      changedAt: new Date(),
      changedBy: req.user.name || 'Shopkeeper',
      note: req.body.note || `Status transitioned to ${nextStatus}`
    });

    // Retention Deadline Setting:
    if (nextStatus === 'PickedUp') {
      order.pickedUpAt = new Date();
      // Retained for 2 hours post-pickup for reprint window
      order.documentRetentionExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    } else if (['Cancelled', 'Rejected'].includes(nextStatus)) {
      // Retained for 24 hours for audit/refund
      order.documentRetentionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await order.save();
    const payload = serializeOrder(order);
    emitOrderEvent(req, 'ORDER_STATUS_UPDATED', payload);
    res.json(payload);
  } catch (error) { next(error); }
});

// 12. Customer Cancellation Endpoint
router.patch('/:id/cancel', protect, allowRoles('customer'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (String(order.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden.' });

    // Customer can only cancel before printing begins
    if (!['Pending', 'Quoted', 'Accepted', 'Queued'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order in '${order.status}' state.` });
    }

    order.status = 'Cancelled';
    order.documentRetentionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    order.statusHistory.push({
      status: 'Cancelled',
      changedAt: new Date(),
      changedBy: req.user.name || 'Customer',
      note: req.body.reason || 'Cancelled by customer'
    });

    await order.save();
    const payload = serializeOrder(order, true);
    emitOrderEvent(req, 'ORDER_STATUS_UPDATED', payload);
    res.json({ message: 'Order cancelled successfully.', order: payload });
  } catch (error) { next(error); }
});

// 13. Counter Pickup: Vendor Validates One-Time 4-Digit PIN
router.post('/:id/pickup', protect, allowRoles('shopkeeper'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select('+pickupPin');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) return res.status(403).json({ message: 'Forbidden.' });
    if (order.status !== 'Ready') return res.status(400).json({ message: 'Order is not ready for pickup.' });

    const submittedPin = String(req.body.pin || '').trim();
    if (!order.pickupPin || !submittedPin || submittedPin !== order.pickupPin) {
      return res.status(400).json({ message: 'Invalid pickup PIN. Handover denied.' });
    }

    order.status = 'PickedUp';
    order.pickedUpAt = new Date();
    order.pickupPin = undefined; // Wipe PIN post-pickup
    if (order.paymentMethod === 'CASH_ON_PICKUP' && order.paymentStatus !== 'Verified') {
      order.paymentStatus = 'Verified';
      order.paymentDetails.paidAt = new Date();
    }
    order.documentRetentionExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours retention
    order.statusHistory.push({
      status: 'PickedUp',
      changedAt: new Date(),
      changedBy: req.user.name || 'Shopkeeper',
      note: 'Verified with counter PIN and handed over'
    });

    await order.save();
    const payload = serializeOrder(order);
    emitOrderEvent(req, 'ORDER_STATUS_UPDATED', payload);
    res.json(payload);
  } catch (error) { next(error); }
});

// 14. Order Messages History
router.get('/:id/messages', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!(await canAccessOrder(order, req.user))) return res.status(403).json({ message: 'Forbidden.' });
    const messages = await Message.find({ orderId: order._id }).sort({ createdAt: 1 }).limit(200);
    res.json(messages);
  } catch (error) { next(error); }
});

export default router;
