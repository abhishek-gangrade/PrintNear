import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Shop from './models/Shop.js';
import User from './models/User.js';

import Order from './models/Order.js';
import Message from './models/Message.js';

dotenv.config();

const seedData = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
    await mongoose.connect(process.env.MONGO_URI);

    await Order.deleteMany({});
    await Message.deleteMany({});
    await Shop.deleteMany({});
    await User.deleteMany({});

    const userPassword = await bcrypt.hash('PrintNearDemo123!', 12);
    const adminPassword = await bcrypt.hash('PrintNearAdmin123!', 12);

    const customer = await User.create({
      name: 'Demo Customer',
      email: 'demo.customer@printnear.test',
      password: userPassword,
      role: 'customer',
      phone: '9000000001'
    });

    const vendor1 = await User.create({
      name: 'Demo Vendor One',
      email: 'demo.vendor@printnear.test',
      password: userPassword,
      role: 'shopkeeper',
      phone: '9000000002'
    });

    const vendor2 = await User.create({
      name: 'Demo Vendor Two',
      email: 'demo.vendor2@printnear.test',
      password: userPassword,
      role: 'shopkeeper',
      phone: '9000000003'
    });

    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@printnear.test',
      password: adminPassword,
      role: 'admin',
      phone: '9000000009'
    });

    await Shop.insertMany([
      {
        ownerId: vendor1._id,
        ownerName: vendor1.name,
        phone: vendor1.phone,
        email: vendor1.email,
        shopName: 'PrintNear Central Hub',
        address: 'Campus Main Road, Indore',
        upiId: 'centralhub@upi',
        location: { type: 'Point', coordinates: [75.8038, 22.6256] },
        pricing: {
          bwPerPage: 3,
          colorPerPage: 10,
          duplexDiscountPercent: 15,
          stapleBindingPrice: 5,
          spiralBindingPrice: 30
        },
        printers: [
          { name: 'Canon ImageRunner 2630i', type: 'Heavy Duty Copier', ppm: 30, supportsColor: true, supportsDuplex: true, isOnline: true },
          { name: 'HP LaserJet Enterprise M608', type: 'Laser', ppm: 65, supportsColor: false, supportsDuplex: true, isOnline: true }
        ],
        capabilities: {
          paperSizes: ['A4', 'A3', 'Legal'],
          bindingServices: { staple: true, spiral: true },
          maxPageLimit: 1000
        },
        operatingHours: { openTime: '08:30', closeTime: '21:30' },
        status: 'active',
        isOpen: true
      },
      {
        ownerId: vendor2._id,
        ownerName: vendor2.name,
        phone: vendor2.phone,
        email: vendor2.email,
        shopName: 'Vishal Printing Hub',
        address: 'Annapurna, Indore',
        upiId: 'vishalprint@upi',
        location: { type: 'Point', coordinates: [75.8341, 22.7022] },
        pricing: {
          bwPerPage: 1.5,
          colorPerPage: 6,
          duplexDiscountPercent: 20,
          stapleBindingPrice: 5,
          spiralBindingPrice: 25
        },
        printers: [
          { name: 'Ricoh MP 2014D', type: 'Heavy Duty Copier', ppm: 20, supportsColor: false, supportsDuplex: true, isOnline: true }
        ],
        capabilities: {
          paperSizes: ['A4'],
          bindingServices: { staple: true, spiral: true },
          maxPageLimit: 500
        },
        operatingHours: { openTime: '09:00', closeTime: '20:00' },
        status: 'active',
        isOpen: true
      }
    ]);

    console.log('Database seeded successfully.');
    console.log('Demo Customer: demo.customer@printnear.test / PrintNearDemo123!');
    console.log('Demo Vendor: demo.vendor@printnear.test / PrintNearDemo123!');
    console.log('Demo Admin: admin@printnear.test / PrintNearAdmin123!');
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedData();
