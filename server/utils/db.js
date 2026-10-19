import mongoose from 'mongoose';

const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

export default connectDB;
