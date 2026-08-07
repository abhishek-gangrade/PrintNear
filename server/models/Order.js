import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  pickupPin: { type: String, required: true },
  pages: { type: Number, required: true, default: 1 },
  copies: { type: Number, required: true, default: 1 },
  printType: { type: String, enum: ['bw', 'color'], default: 'bw' },
  printSide: { type: String, enum: ['single', 'double'], default: 'single' },
  totalAmount: { type: Number, required: true },
  paymentScreenshotUrl: { type: String, default: '' },
  paymentVerified: { type: Boolean, default: false },
  status: { type: String, enum: ['PENDING', 'PRINTING', 'COMPLETED'], default: 'PENDING' }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);