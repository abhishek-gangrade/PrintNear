import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otp: {
      type: String,
      required: true,
      trim: true
    },
    userData: {
      type: Object,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically deletes document when expiresAt is reached
    }
  },
  { timestamps: true }
);

export default mongoose.model('Otp', otpSchema);

