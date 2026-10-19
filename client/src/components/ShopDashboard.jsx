import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import LiveChat from './LiveChat';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export default function ShopDashboard({ user }) {
  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [pickupOrder, setPickupOrder] = useState(null);
  const [pickupPin, setPickupPin] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bwRate, setBwRate] = useState(3);
  const [colorRate, setColorRate] = useState(10);
  const [printers, setPrinters] = useState([]);
  const [updateMsg, setUpdateMsg] = useState('');

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchDashboardData = async () => {
    try {
      const shopRes = await axios.get('/api/shops/my-shop', config);
      const s = shopRes.data;
      setShop(s);
      setShopName(s.shopName || '');
      setAddress(s.address || '');
      setUpiId(s.upiId || '');
      setBwRate(s.pricing?.bwPerPage ?? 3);
      setColorRate(s.pricing?.colorPerPage ?? 10);
      setPrinters(s.printers || []);

      const ordersRes = await axios.get(`/api/orders/shop/${s._id}`, config);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load vendor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!shop?._id) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('join_shop', shop._id));
    socket.on('NEW_ORDER_RECEIVED', order => setOrders(prev => [order, ...prev.filter(o => o._id !== order._id)]));
    socket.on('ORDER_STATUS_UPDATED', order => setOrders(prev => prev.map(o => o._id === order._id ? { ...o, ...order } : o)));
    socket.on('PAYMENT_STATUS_UPDATED', order => setOrders(prev => prev.map(o => o._id === order._id ? { ...o, ...order } : o)));
    return () => socket.disconnect();
  }, [shop?._id]);

  const updateStatus = async (orderId, status, note = '') => {
    try {
      const res = await axios.patch(`/api/orders/${orderId}/status`, { status, note }, config);
      setOrders(prev => prev.map(o => o._id === orderId ? res.data : o));
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed.');
    }
  };

  const updatePayment = async (orderId, paymentStatus) => {
    try {
      const res = await axios.patch(`/api/orders/${orderId}/payment`, { paymentStatus }, config);
      setOrders(prev => prev.map(o => o._id === orderId ? res.data : o));
    } catch (err) {
      alert(err.response?.data?.message || 'Payment update failed.');
    }
  };

  const handleViewDocument = async (orderId) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/document`, {
        ...config,
        responseType: 'blob'
      });
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(fileUrl, '_blank');
    } catch (err) {
      let errorMsg = 'Document is inaccessible or has expired.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) errorMsg = json.message;
        } catch {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      alert(errorMsg);
    }
  };

  const confirmPickup = async e => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/orders/${pickupOrder._id}/pickup`, { pin: pickupPin }, config);
      setOrders(prev => prev.map(o => o._id === pickupOrder._id ? res.data : o));
      setPickupOrder(null);
      setPickupPin('');
      alert('Pickup confirmed! Document retention countdown initiated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid pickup PIN.');
    }
  };

  const saveShop = async e => {
    e.preventDefault();
    try {
      const res = await axios.patch(`/api/shops/${shop._id}`, {
        shopName,
        address,
        upiId,
        pricing: {
          bwPerPage: Number(bwRate),
          colorPerPage: Number(colorRate),
          duplexDiscountPercent: 15,
          stapleBindingPrice: 5,
          spiralBindingPrice: 30
        },
        printers
      }, config);
      setShop(res.data);
      setUpdateMsg('Shop settings updated successfully.');
      setTimeout(() => setUpdateMsg(''), 4000);
    } catch (err) {
      setUpdateMsg(err.response?.data?.message || 'Failed to update settings.');
    }
  };

  const togglePrinterStatus = (index) => {
    const updated = [...printers];
    updated[index].isOnline = !updated[index].isOnline;
    setPrinters(updated);
  };

  if (loading) return <div className="bg-white rounded-3xl p-12 text-center text-sm font-bold">Loading Vendor Dashboard...</div>;

  return (
    <div className="space-y-8 font-sans">
      <div className="border-b border-slate-200 pb-5">
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider">
          Vendor Operational Hub
        </span>
        <h1 className="text-2xl font-black text-slate-900 mt-2">{shopName || 'Print Shop'}</h1>
        <p className="text-xs text-slate-500 mt-1">Manage print queues, document access, printer fleet, and counter pickup PIN verification.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-2xl">{error}</div>}
      {updateMsg && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl">{updateMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Orders Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Incoming Orders Queue ({orders.length})</h2>
            <button onClick={fetchDashboardData} className="text-xs text-blue-600 font-bold hover:underline cursor-pointer">
              🔄 Refresh List
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white border rounded-3xl p-10 text-center text-slate-400 text-xs">
              No orders received yet. Active customer orders will appear here in real time.
            </div>
          ) : (
            orders.map(order => (
              <div key={order._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900">Order #{order._id?.slice(-6)}</span>
                    <p className="text-[11px] text-slate-500">Customer: <strong>{order.userName}</strong></p>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    order.status === 'Ready' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'Printing' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Print</span>
                    <b>{order.pages} pgs × {order.copies} cps ({order.paperSize || 'A4'})</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Layout</span>
                    <b>{order.colorType} · {order.orientation}</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Finish</span>
                    <b>{order.printSides} · {order.binding}</b>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount</span>
                    <b className="text-emerald-700 font-black">₹{order.totalAmount}</b>
                  </div>
                </div>

                {order.customerNotes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs">
                    <b>Customer Instructions:</b> {order.customerNotes}
                  </div>
                )}

                {/* Document Access & Communication */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => handleViewDocument(order._id)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>👁️</span> Open & Print Document
                  </button>
                  <button
                    onClick={() => setActiveChatOrder(order._id)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer"
                  >
                    💬 Live Chat
                  </button>
                  {order.paymentStatus !== 'Verified' && (
                    <button
                      onClick={() => updatePayment(order._id, 'Verified')}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer"
                    >
                      ✓ Verify UTR Payment
                    </button>
                  )}
                </div>

                {/* Workflow Transitions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <div className="text-[11px] text-slate-600">
                    Payment: <strong className={order.paymentStatus === 'Verified' ? 'text-emerald-600' : 'text-amber-600'}>{order.paymentStatus}</strong>
                    {order.transactionUtr ? ` (UTR: ${order.transactionUtr})` : ''}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'Ready' && (
                      <button
                        onClick={() => setPickupOrder(order)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        🔑 Verify Pickup PIN
                      </button>
                    )}

                    {['Pending', 'Accepted'].includes(order.status) && (
                      <button
                        onClick={() => updateStatus(order._id, 'Printing')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        ▶ Start Printing
                      </button>
                    )}

                    {order.status === 'Printing' && (
                      <button
                        onClick={() => updateStatus(order._id, 'Ready')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        ✓ Mark Ready for Pickup
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Fleet & Tariff Settings */}
        <div className="space-y-6">
          {/* Printer Fleet Management */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Printer Inventory</h3>
            <p className="text-xs text-slate-500">Live printer telemetry controls ECT completion time estimates.</p>
            <div className="space-y-3">
              {printers.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.type} · {p.ppm} PPM</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePrinterStatus(idx)}
                    className={`px-3 py-1 rounded-xl font-bold text-[10px] cursor-pointer ${
                      p.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {p.isOnline ? 'Online' : 'Offline'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing & Store Configuration */}
          <form onSubmit={saveShop} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tariff & Shop Details</h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Shop Name</label>
              <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border rounded-xl p-2.5 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border rounded-xl p-2.5 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">UPI ID for Payments</label>
              <input value={upiId} onChange={e => setUpiId(e.target.value)} className="w-full border rounded-xl p-2.5 text-xs font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">B&W Rate (₹/pg)</label>
                <input type="number" step="0.5" value={bwRate} onChange={e => setBwRate(e.target.value)} className="w-full border rounded-xl p-2 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Color Rate (₹/pg)</label>
                <input type="number" step="0.5" value={colorRate} onChange={e => setColorRate(e.target.value)} className="w-full border rounded-xl p-2 text-xs" />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer">
              Save Store Settings
            </button>
          </form>
        </div>
      </div>

      {/* Pickup Verification Modal */}
      {pickupOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={confirmPickup} className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Verify Counter Pickup PIN</h3>
            <p className="text-xs text-slate-500">
              Customer must show their 4-digit PIN for order #{pickupOrder._id?.slice(-6)}.
            </p>
            <input
              type="text"
              required
              maxLength={4}
              placeholder="e.g. 5492"
              value={pickupPin}
              onChange={e => setPickupPin(e.target.value)}
              className="w-full text-center tracking-widest text-2xl font-mono font-black border rounded-2xl p-3"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPickupOrder(null); setPickupPin(''); }}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs">
                Confirm Handover
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Chat Modal */}
      {activeChatOrder && (
        <LiveChat orderId={activeChatOrder} currentUser={user} onClose={() => setActiveChatOrder(null)} />
      )}
    </div>
  );
}
