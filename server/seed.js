import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import User from './models/User.js';

dotenv.config({ override: true });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding...');

    // Clean existing shop collection
    await Shop.deleteMany({});

    // Create or find dummy owner user
    let owner = await User.findOne({ email: 'owner@printnear.com' });
    if (!owner) {
      owner = await User.create({
        name: 'Abhishek Gangrade',
        email: 'owner@printnear.com',
        password: '$2a$10$dummyhashedpassword',
        role: 'shopkeeper',
        phone: '9876543210'
      });
    }

    const shops = [
      {
        ownerId: owner._id,
        shopName: 'PrintNear Central Hub',
        ownerName: 'Abhishek Gangrade',
        phone: '9876543210',
        email: 'centralhub@printnear.com',
        address: 'Campus Main Road, Gate 1, Indore',
        location: {
          type: 'Point',
          // Coordinates: [Longitude, Latitude] for Medi-Caps / Campus Gate 1 area
          coordinates: [75.8038, 22.6256] 
        },
        pricing: { bwPerPage: 3, colorPerPage: 10 },
        isOpen: true
      },
      {
        ownerId: owner._id,
        shopName: 'Vishal Printing Hub',
        ownerName: 'Vishal Sharma',
        phone: '9123456789',
        email: 'vishalprints@gmail.com',
        address: 'Near Narendra Tiwari Marg, Annapurna, Indore',
        location: {
          type: 'Point',
          // Coordinates: [Longitude, Latitude] for Narendra Tiwari Marg / Annapurna area
          coordinates: [75.8341, 22.7022] 
        },
        pricing: { bwPerPage: 1, colorPerPage: 5 },
        isOpen: true
      }
    ];

    await Shop.insertMany(shops);
    console.log('Database Seeded Successfully with Exact GPS Coordinates!');
    process.exit();
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedData();