import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['customer', 'shopkeeper'], required: true },
    senderName: { type: String, required: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

messageSchema.index({ orderId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
