import express from 'express';
import Shop from '../models/Shop.js';
import User from '../models/User.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';
import { recommendShops } from '../utils/recommendationEngine.js';

const router = express.Router();

router.get('/my-shop', protect, allowRoles('shopkeeper'), async (req, res, next) => {
  try {
    let shop = await Shop.findOne({ ownerId: req.user.id });
    if (!shop) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      shop = await Shop.create({
        ownerId: user._id,
        ownerName: user.name,
        email: user.email,
        phone: user.phone || 'Not Provided',
        shopName: `${user.name}'s Print Hub`,
        address: 'Local Area',
        pricing: {
          bwPerPage: 3,
          colorPerPage: 10,
          duplexDiscountPercent: 15,
          stapleBindingPrice: 5,
          spiralBindingPrice: 30
        },
        printers: [
          { name: 'Office Laserjet A4', type: 'Heavy Duty Copier', ppm: 25, supportsColor: true, supportsDuplex: true, isOnline: true }
        ]
      });
    }
    res.json(shop);
  } catch (error) { next(error); }
});

// Multi-Factor Shop Recommendation API
router.get('/recommend', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }

    const recommended = await recommendShops({
      userLat: lat,
      userLng: lng,
      maxDistance: Number(req.query.maxDistance) || 5000,
      pages: Number(req.query.pages) || 1,
      copies: Number(req.query.copies) || 1,
      colorType: req.query.colorType || 'B&W',
      printSides: req.query.printSides || 'Single',
      paperSize: req.query.paperSize || 'A4',
      binding: req.query.binding || 'None',
      sortBy: req.query.sortBy || 'best_match'
    });

    res.json(recommended);
  } catch (error) { next(error); }
});

router.get('/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const maxDistance = Math.min(Number(req.query.maxDistance) || 5000, 25000);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }

    const shops = await Shop.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          maxDistance,
          spherical: true,
          query: { isOpen: true, status: { $in: ['active', null] } }
        }
      },
      { $limit: 50 }
    ]);
    res.json(shops);
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const shops = await Shop.find({ isOpen: true, status: { $in: ['active', null] } }).sort({ createdAt: -1 });
    res.json(shops);
  } catch (error) { next(error); }
});

router.patch('/:id', protect, allowRoles('shopkeeper', 'admin'), async (req, res, next) => {
  try {
    const {
      shopName, address, upiId, pricing, location, isOpen,
      printers, operatingHours, capabilities, status
    } = req.body;

    const update = {};
    if (shopName?.trim()) update.shopName = shopName.trim().slice(0, 100);
    if (address?.trim()) update.address = address.trim().slice(0, 250);
    if (upiId !== undefined) update.upiId = String(upiId).trim().slice(0, 100);
    if (pricing) {
      const bw = Number(pricing.bwPerPage);
      const color = Number(pricing.colorPerPage);
      if (!Number.isFinite(bw) || !Number.isFinite(color) || bw < 0.5 || color < 0.5) {
        return res.status(400).json({ message: 'Invalid print pricing.' });
      }
      update.pricing = {
        bwPerPage: bw,
        colorPerPage: color,
        duplexDiscountPercent: Number(pricing.duplexDiscountPercent ?? 15),
        stapleBindingPrice: Number(pricing.stapleBindingPrice ?? 5),
        spiralBindingPrice: Number(pricing.spiralBindingPrice ?? 30)
      };
    }
    if (location?.coordinates) update.location = { type: 'Point', coordinates: location.coordinates };
    if (typeof isOpen === 'boolean') update.isOpen = isOpen;
    if (Array.isArray(printers)) update.printers = printers;
    if (operatingHours) update.operatingHours = operatingHours;
    if (capabilities) update.capabilities = capabilities;

    // Only platform admin can change shop active/suspension status
    if (status && req.user.role === 'admin') {
      update.status = status;
    }

    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user.id };

    const shop = await Shop.findOneAndUpdate(query, { $set: update }, { new: true, runValidators: true });
    if (!shop) return res.status(403).json({ message: 'Unauthorized shop update.' });
    res.json(shop);
  } catch (error) { next(error); }
});

export default router;
