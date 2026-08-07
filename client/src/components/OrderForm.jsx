import React, { useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import LiveChat from './LiveChat';

function OrderForm({ shop, user }) {
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '9876543210');
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [printType, setPrintType] = useState('bw');
  const [printSide, setPrintSide] = useState('single');
  const [file, setFile] = useState(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);

  // Dynamic Price Calculation
  let ratePerPage = printType === 'bw' 
    ? (shop.pricing?.bwPerPage || 3) 
    : (shop.pricing?.colorPerPage || 10);

  let activeDiscountText = '';

  if (printType === 'bw' && shop.discountTiers && shop.discountTiers.length > 0) {
    const sortedTiers = [...shop.discountTiers].sort((a, b) => b.minPages - a.minPages);
    const matchingTier = sortedTiers.find((t) => pages >= t.minPages);

    if (matchingTier) {
      ratePerPage = matchingTier.bwRate;
      activeDiscountText = `🔥 Special Rate Applied: ${matchingTier.minPages}+ Pages @ ₹${matchingTier.bwRate}/pg!`;
    }
  }

  if (printSide === 'double') {
    ratePerPage = ratePerPage * 0.85;
  }

  const totalAmount = Math.max(1, Math.round(pages * copies * ratePerPage));

  // Dynamic Real UPI URI
  const shopUpiId = shop.upiId || (shop.phone ? `${shop.phone}@paytm` : 'printnear@upi');
  const shopNameEncoded = encodeURIComponent(shop.shopName || 'PrintNear Shop');
  const upiURI = `upi://pay?pa=${shopUpiId}&pn=${shopNameEncoded}&am=${totalAmount}&cu=INR&tn=PrintNear%20Order`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please upload a PDF document.");
    if (!paymentScreenshot) return alert("Please upload your UPI Payment screenshot.");

    setLoading(true);

    const formData = new FormData();
    formData.append('shopId', shop._id);
    formData.append('customerName', customerName || 'Guest');
    formData.append('customerPhone', customerPhone);
    formData.append('pages', pages);
    formData.append('copies', copies);
    formData.append('printType', printType);
    formData.append('printSide', printSide);
    formData.append('document', file);
    formData.append('paymentScreenshot', paymentScreenshot);

    try {
      const res = await axios.post('/api/orders/create', formData);
      setOrder(res.data);
    } catch (err) {
      alert("Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (order) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
        <div className="text-green-500 text-4xl text-center mb-2">✓</div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">Order Submitted!</h2>
        <p className="text-center text-xs text-slate-500 mb-4">Your document is queued for printing.</p>

        <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-2 mb-4">
          <div className="flex justify-between"><span className="text-gray-500">Order ID:</span> <span className="font-mono font-bold">{order._id}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Pickup PIN:</span> <span className="font-mono font-bold text-blue-600 text-sm">{order.pickupPin}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount Paid:</span> <span className="font-bold text-slate-900">₹{order.totalAmount}</span></div>
        </div>

        <LiveChat orderId={order._id} currentUserRole={user?.role} customerName={user?.name} />

        <button onClick={() => setOrder(null)} className="w-full mt-4 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs">
          Place Another Order
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Order from {shop.shopName}</h2>

      {activeDiscountText && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl mb-4">
          {activeDiscountText}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Name</label>
            <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Phone</label>
            <input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border rounded-lg p-2 text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Print Color</label>
            <select value={printType} onChange={(e) => setPrintType(e.target.value)} className="w-full border rounded-lg p-2 text-xs">
              <option value="bw">Black & White</option>
              <option value="color">Full Color</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Side Mode</label>
            <select value={printSide} onChange={(e) => setPrintSide(e.target.value)} className="w-full border rounded-lg p-2 text-xs">
              <option value="single">Single Sided</option>
              <option value="double">Double Sided (15% Off)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Total Pages</label>
            <input type="number" min="1" value={pages} onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))} className="w-full border rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Copies</label>
            <input type="number" min="1" value={copies} onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))} className="w-full border rounded-lg p-2 text-xs" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">1. Upload Document (PDF/DOC)</label>
          <input type="file" required accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} className="w-full border text-xs rounded-lg p-2 bg-slate-50" />
        </div>

        {/* Real Dynamic UPI Payment Section */}
        <div className="border border-blue-200 bg-blue-50/40 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-blue-900 uppercase">2. Pay via Dynamic UPI / QR</p>
            <span className="text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">₹{totalAmount}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-lg border border-blue-100">
            <div className="p-2 bg-white rounded-lg border shadow-2xs">
              <QRCodeSVG value={upiURI} size={110} level="H" />
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <p className="text-[11px] text-slate-600">
                Scan with <strong>GPay, PhonePe, Paytm</strong> or pay to UPI ID:
              </p>
              <div className="inline-block font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded border border-slate-200 select-all">
                {shopUpiId}
              </div>

              <div className="pt-1">
                <a 
                  href={upiURI} 
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-2xs transition"
                >
                  ⚡ Open in UPI App
                </a>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">3. Upload Payment Screenshot</label>
            <input type="file" required accept="image/*" onChange={(e) => setPaymentScreenshot(e.target.files[0])} className="w-full border text-xs rounded-lg p-1.5 bg-white" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md disabled:opacity-50">
          {loading ? 'Submitting Order & Payment...' : 'Confirm Order & Submit Proof'}
        </button>
      </form>
    </div>
  );
}

export default OrderForm;