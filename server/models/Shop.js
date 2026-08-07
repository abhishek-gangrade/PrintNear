import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopName: { type: String, required: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  upiId: { type: String, default: '' },
  address: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [75.8577, 22.7196] }
  },
  pricing: {
    bwPerPage: { type: Number, default: 3 },
    colorPerPage: { type: Number, default: 10 }
  },
  discountTiers: [{
    minPages: { type: Number, required: true },
    bwRate: { type: Number, required: true }
  }],
  todayRevenue: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  isOpen: { type: Boolean, default: true }
}, { timestamps: true });

shopSchema.index({ location: '2dsphere' });

export default mongoose.model('Shop', shopSchema);