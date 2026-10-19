import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true, trim: true, maxlength: 80 },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    filePath: { type: String, default: '' },
    filePublicId: { type: String, default: '' },
    fileResourceType: { type: String, default: 'raw' },
    originalFileName: { type: String, required: true, maxlength: 180 },
    pages: { type: Number, min: 1, max: 1000, default: 1 },
    copies: { type: Number, min: 1, max: 100, default: 1 },
    pageRange: { type: String, default: 'All', trim: true, maxlength: 50 },
    paperSize: { type: String, enum: ['A4', 'A3', 'Legal', 'Letter'], default: 'A4' },
    colorType: { type: String, enum: ['B&W', 'Color'], default: 'B&W' },
    orientation: { type: String, enum: ['Portrait', 'Landscape'], default: 'Portrait' },
    printSides: { type: String, enum: ['Single', 'Double'], default: 'Single' },
    printQuality: { type: String, enum: ['Standard', 'High'], default: 'Standard' },
    binding: { type: String, enum: ['None', 'Staple', 'Spiral'], default: 'None' },
    customerNotes: { type: String, default: '', maxlength: 1000 },
    couponCode: { type: String, default: '', uppercase: true, trim: true, maxlength: 30 },
    subtotal: { type: Number, required: true, min: 1 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 1 },
    transactionUtr: { type: String, default: '', trim: true, maxlength: 80 },
    paymentMethod: {
      type: String,
      enum: ['UPI_MANUAL', 'RAZORPAY', 'CASH_ON_PICKUP'],
      default: 'UPI_MANUAL'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Submitted', 'Verified', 'Rejected', 'Refunded'],
      default: 'Pending',
      index: true
    },
    paymentDetails: {
      razorpayOrderId: { type: String, default: '' },
      razorpayPaymentId: { type: String, default: '' },
      razorpaySignature: { type: String, default: '' },
      paidAt: { type: Date, default: null },
      refundId: { type: String, default: '' },
      refundAmount: { type: Number, default: 0 },
      refundedAt: { type: Date, default: null }
    },
    pricingSnapshot: {
      bwPerPage: { type: Number, default: 3 },
      colorPerPage: { type: Number, default: 10 },
      bindingFee: { type: Number, default: 0 },
      volumeDiscount: { type: Number, default: 0 },
      duplexDiscount: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: [
        'Draft', 'Quoted', 'Payment_Pending', 'Paid', 'Pending',
        'Accepted', 'Queued', 'Printing', 'Ready', 'PickedUp',
        'Cancelled', 'Rejected', 'Refund_Pending', 'Refunded'
      ],
      default: 'Pending',
      index: true
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String, default: 'System' },
        note: { type: String, default: '' }
      }
    ],
    queueInfo: {
      assignedPrinterId: { type: String, default: '' },
      assignedPrinterName: { type: String, default: '' },
      estimatedCompletionMinutes: { type: Number, default: 0 },
      estimatedReadyAt: { type: Date, default: null },
      predictionAlgorithm: { type: String, default: 'analytical_baseline' }
    },
    rejectionReason: { type: String, default: '' },
    pickupPin: { type: String, select: false },
    pickedUpAt: { type: Date, default: null },
    documentRetentionExpiresAt: { type: Date, default: null, index: true },
    documentDeletedAt: { type: Date, default: null },
    deletionStatus: {
      type: String,
      enum: ['Active', 'Pending_Deletion', 'Deleted', 'Failed'],
      default: 'Active'
    },
    deletionRetryCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

orderSchema.index({ shopId: 1, status: 1, createdAt: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
