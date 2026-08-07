import Order from '../models/Order.js';

export const createOrder = async (req, res) => {
  try {
    const { shopId, customerName, customerPhone, fileUrl, fileName, printConfig, totalAmount } = req.body;
    const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();

    const order = await Order.create({
      shopId,
      customerName,
      customerPhone,
      fileUrl,
      fileName,
      printConfig,
      totalAmount,
      pickupPin
    });

    const io = req.app.get('io');
    io.to(shopId.toString()).emit('NEW_ORDER_RECEIVED', order);

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};