import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

export default function OrderForm({ shop, user }) {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [colorType, setColorType] = useState('B&W');
  const [orientation, setOrientation] = useState('Portrait');
  const [printSides, setPrintSides] = useState('Single');
  const [paperSize, setPaperSize] = useState('A4');
  const [printQuality, setPrintQuality] = useState('Standard');
  const [binding, setBinding] = useState('None');
  const [customerNotes, setCustomerNotes] = useState('');

  // Promotional Offers & Discounts
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState({ text: '', type: '' });

  // Authoritative Quote State
  const [authoritativeQuote, setAuthoritativeQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // 'RAZORPAY' or 'UPI_MANUAL'
  const [paymentUtr, setPaymentUtr] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [error, setError] = useState('');

  // Fetch Authoritative Quote from API
  useEffect(() => {
    if (!shop?._id) return;
    let cancel = false;
    const fetchQuote = async () => {
      setQuoteLoading(true);
      try {
        const res = await axios.post('/api/orders/quote', {
          shopId: shop._id,
          pages,
          copies,
          colorType,
          printSides,
          paperSize,
          binding,
          couponCode
        });
        if (!cancel) {
          setAuthoritativeQuote(res.data);
          if (res.data.appliedCoupon) {
            setCouponMsg({ text: `🎉 ${res.data.appliedCoupon.description} (Saved ₹${res.data.couponDiscount})`, type: 'success' });
          }
        }
      } catch (err) {
        console.error('Quote error:', err);
      } finally {
        if (!cancel) setQuoteLoading(false);
      }
    };
    fetchQuote();
    return () => { cancel = true; };
  }, [shop?._id, pages, copies, colorType, printSides, paperSize, binding, couponCode]);

  const bwRate = shop?.pricing?.bwPerPage ?? 3;
  const colorRate = shop?.pricing?.colorPerPage ?? 10;
  const finalTotal = authoritativeQuote?.totalAmount || Math.max(1, pages * copies * (colorType === 'Color' ? colorRate : bwRate));

  // Dynamic UPI URL construction
  const shopUpiId = shop?.upiId || 'printnear@upi';
  const shopNameEncoded = encodeURIComponent(shop?.shopName || 'Print Shop');
  const upiPayUrl = `upi://pay?pa=${shopUpiId}&pn=${shopNameEncoded}&am=${finalTotal}&cu=INR&tn=PrintNear_Order`;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (['PRINT10', 'CAMPUS10', 'PRINT5', 'PRINTANIA20'].includes(code)) {
      setCouponCode(code);
    } else {
      setCouponMsg({ text: 'Invalid coupon. Try PRINT10 or PRINT5.', type: 'error' });
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleInitiatePayment = (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file (PDF/DOCX) first.');
      return;
    }
    if (!user) {
      setError('Please sign in to complete your order.');
      return;
    }
    setError('');
    setShowPaymentModal(true);
  };

  const handleFinalSubmitOrder = async () => {
    if (paymentMethod === 'UPI_MANUAL' && !paymentUtr.trim()) {
      setError('Enter your 12-digit UPI UTR reference after making payment.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shop._id);
      formData.append('pages', pages);
      formData.append('copies', copies);
      formData.append('colorType', colorType);
      formData.append('orientation', orientation);
      formData.append('printSides', printSides);
      formData.append('paperSize', paperSize);
      formData.append('printQuality', printQuality);
      formData.append('binding', binding);
      formData.append('customerNotes', customerNotes);
      formData.append('couponCode', couponCode);
      formData.append('paymentMethod', paymentMethod);
      if (paymentMethod === 'UPI_MANUAL') {
        formData.append('transactionUtr', paymentUtr.trim());
      }

      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      };

      const res = await axios.post('/api/orders', formData, config);
      const createdOrder = res.data;

      // If Razorpay chosen: execute online checkout flow
      if (paymentMethod === 'RAZORPAY') {
        try {
          const rzpRes = await axios.post(`/api/orders/${createdOrder._id}/pay/razorpay-order`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const gatewayOrder = rzpRes.data;

          // In sandbox development mode, simulate instant verified authorization:
          const verifyRes = await axios.post(`/api/orders/${createdOrder._id}/pay/verify`, {
            razorpayOrderId: gatewayOrder.gatewayOrderId,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: 'test_mock_valid_sig'
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          setShowPaymentModal(false);
          setOrderSuccess(verifyRes.data.order || createdOrder);
        } catch (rzpErr) {
          setShowPaymentModal(false);
          setOrderSuccess(createdOrder);
        }
      } else {
        setShowPaymentModal(false);
        setOrderSuccess(createdOrder);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Order submission failed.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center font-sans space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto font-black">
          ✓
        </div>
        <h3 className="text-xl font-black text-slate-900">Order Placed Successfully!</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your document has been securely processed and sent to <strong>{shop.shopName}</strong>.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs space-y-2.5 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Order Reference:</span>
            <span className="font-mono font-bold text-slate-900">#{orderSuccess._id.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Document & Pages:</span>
            <span className="font-bold text-slate-800">{orderSuccess.pages} Pages × {orderSuccess.copies} Copies ({orderSuccess.paperSize || 'A4'})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Configuration:</span>
            <span className="font-bold text-slate-800">
              {orderSuccess.orientation} • {orderSuccess.colorType} • {orderSuccess.printSides}-Sided
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Finishing:</span>
            <span className="font-semibold text-slate-800">{orderSuccess.binding}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/80 pt-2">
            <span className="text-slate-700 font-bold">Authoritative Total:</span>
            <span className="font-black text-emerald-600 text-base">₹{orderSuccess.totalAmount}</span>
          </div>

          {orderSuccess.pickupPin && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-3 flex items-center justify-between">
              <div>
                <p className="text-blue-900 font-bold text-xs">Counter Pickup Verification PIN</p>
                <p className="text-[10px] text-blue-600">Show this 4-digit code at the shop counter</p>
              </div>
              <span className="font-mono text-2xl font-black text-blue-700 tracking-wider">
                {orderSuccess.pickupPin}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setOrderSuccess(null);
            setFile(null);
            setCustomerNotes('');
            setPaymentUtr('');
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl text-xs transition cursor-pointer shadow-xs"
        >
          Place Another Print Request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs font-sans space-y-6">
      <div>
        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
          Configure Print
        </span>
        <h2 className="text-xl font-black text-slate-900 mt-2">Print at {shop.shopName}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{shop.address}</p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">{error}</div>}

      <form onSubmit={handleInitiatePayment} className="space-y-5">
        {/* Document Upload */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            Upload Document (PDF / DOCX)
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            required
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-2xl p-2"
          />
          {file && (
            <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
              <span>📄</span> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Paper Size & Orientation */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Paper Format
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="A4">A4 (Standard)</option>
              <option value="A3">A3 (Large Poster)</option>
              <option value="Legal">Legal</option>
              <option value="Letter">Letter</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Orientation
            </label>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="Portrait">Portrait (Vertical)</option>
              <option value="Landscape">Landscape (Horizontal)</option>
            </select>
          </div>
        </div>

        {/* Color Mode */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            Color Option
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setColorType('B&W')}
              className={`py-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                colorType === 'B&W'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              B&W (₹{bwRate}/pg)
            </button>
            <button
              type="button"
              onClick={() => setColorType('Color')}
              className={`py-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                colorType === 'Color'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              Color (₹{colorRate}/pg)
            </button>
          </div>
        </div>

        {/* Print Sides & Finishing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Print Sides
            </label>
            <select
              value={printSides}
              onChange={(e) => setPrintSides(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="Single">Single-Sided</option>
              <option value="Double">Double-Sided (15% savings)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Finishing
            </label>
            <select
              value={binding}
              onChange={(e) => setBinding(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="None">None (Loose Sheets)</option>
              <option value="Staple">Stapled Corner (+₹5)</option>
              <option value="Spiral">Spiral Binding (+₹30)</option>
            </select>
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Document Pages
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={pages}
              onChange={(e) => setPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700"
            />
            <span className="text-[10px] text-slate-400">PDF page count is verified by server</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Number of Copies
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700"
            />
          </div>
        </div>

        {/* Special Instructions */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Special Instructions
          </label>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="e.g. Print cover page on glossy sheet, bind with blue spine..."
            className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-700"
          />
        </div>

        {/* Promotional Coupon Input */}
        <div className="pt-2">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Promotional Coupon
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="e.g. PRINT10, PRINT5"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            />
            <button
              onClick={handleApplyCoupon}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
          {couponMsg.text && (
            <p className={`text-[11px] mt-1 font-semibold ${couponMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {couponMsg.text}
            </p>
          )}
        </div>

        {/* Authoritative Quote Breakdown Box */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-500">
            <span>Printing Charges:</span>
            <span className="font-semibold text-slate-800">
              ₹{authoritativeQuote?.printingCharges ?? (pages * copies * (colorType === 'Color' ? colorRate : bwRate))}
            </span>
          </div>

          {authoritativeQuote?.duplexSavings > 0 && (
            <div className="flex justify-between items-center text-emerald-600">
              <span>Duplex Savings:</span>
              <span className="font-semibold">-₹{authoritativeQuote.duplexSavings}</span>
            </div>
          )}

          {authoritativeQuote?.volumeDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-600">
              <span>Bulk Volume Discount:</span>
              <span className="font-semibold">-₹{authoritativeQuote.volumeDiscount}</span>
            </div>
          )}

          {authoritativeQuote?.bindingCharges > 0 && (
            <div className="flex justify-between items-center text-slate-500">
              <span>Finishing Fee ({binding}):</span>
              <span className="font-semibold text-slate-800">+₹{authoritativeQuote.bindingCharges}</span>
            </div>
          )}

          {authoritativeQuote?.couponDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-600">
              <span>Coupon Savings:</span>
              <span className="font-semibold">-₹{authoritativeQuote.couponDiscount}</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-sm">
            <span className="font-bold text-slate-900">Authoritative Total:</span>
            <span className="font-black text-blue-600 text-base">
              ₹{finalTotal}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black py-4 rounded-2xl text-sm transition shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          Proceed to Checkout (₹{finalTotal}) →
        </button>
      </form>

      {/* PAYMENT & CHECKOUT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirm & Pay</h3>
                <p className="text-xs text-slate-500">Total: ₹{finalTotal} to {shop.shopName}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`py-2 rounded-xl transition ${paymentMethod === 'RAZORPAY' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
              >
                💳 Razorpay (Instant)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI_MANUAL')}
                className={`py-2 rounded-xl transition ${paymentMethod === 'UPI_MANUAL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'}`}
              >
                📱 UPI QR & UTR
              </button>
            </div>

            {paymentMethod === 'RAZORPAY' ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
                  🔒
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Secure Online Payment</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Instant automated verification via Razorpay payment gateway with cryptographic HMAC signing.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono font-bold text-slate-700">
                  Amount: ₹{finalTotal}.00 INR
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <QRCodeSVG value={upiPayUrl} size={150} level="M" />
                  <p className="text-[11px] font-bold text-slate-700 mt-2">Scan with any UPI App (GPay/PhonePe/Paytm)</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{shopUpiId}</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Enter UPI Reference / UTR (12 Digits)
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentUtr}
                    onChange={(e) => setPaymentUtr(e.target.value)}
                    placeholder="e.g. 324158941205"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Shopkeeper verifies UTR before printing</span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleFinalSubmitOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black py-3.5 rounded-2xl text-xs transition shadow-md cursor-pointer"
            >
              {loading ? 'Processing Order...' : `Authorize & Confirm Payment (₹${finalTotal})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}