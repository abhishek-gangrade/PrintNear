import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 250 },
    upiId: { type: String, default: '', trim: true, maxlength: 100 },
    pricing: {
      bwPerPage: { type: Number, min: 0.5, max: 1000, default: 3 },
      colorPerPage: { type: Number, min: 0.5, max: 1000, default: 10 },
      duplexDiscountPercent: { type: Number, min: 0, max: 50, default: 15 },
      stapleBindingPrice: { type: Number, min: 0, max: 100, default: 5 },
      spiralBindingPrice: { type: Number, min: 0, max: 500, default: 30 }
    },
    printers: [
      {
        name: { type: String, default: 'Main Office Laser' },
        type: { type: String, enum: ['Laser', 'Inkjet', 'Heavy Duty Copier'], default: 'Heavy Duty Copier' },
        ppm: { type: Number, default: 25 },
        supportsColor: { type: Boolean, default: true },
        supportsDuplex: { type: Boolean, default: true },
        isOnline: { type: Boolean, default: true }
      }
    ],
    operatingHours: {
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' }
    },
    capabilities: {
      paperSizes: { type: [String], default: ['A4', 'A3'] },
      bindingServices: {
        staple: { type: Boolean, default: true },
        spiral: { type: Boolean, default: true }
      },
      maxPageLimit: { type: Number, default: 1000 }
    },
    rating: {
      average: { type: Number, default: 4.8, min: 1, max: 5 },
      count: { type: Number, default: 12 }
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending_approval'],
      default: 'active',
      index: true
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        validate: {
          validator: v => Array.isArray(v) && v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'Location must be [longitude, latitude].'
        },
        default: [75.8577, 22.7196]
      }
    },
    isOpen: { type: Boolean, default: true }
  },
  { timestamps: true }
);

shopSchema.index({ location: '2dsphere' });

export default mongoose.model('Shop', shopSchema);
