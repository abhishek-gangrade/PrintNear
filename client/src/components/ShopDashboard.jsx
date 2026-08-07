import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import LiveChat from './LiveChat';

const socket = io('http://localhost:5001');

export default function ShopDashboard({ shopId }) {
  const [orders, setOrders] = useState([]);
  const [activeChatOrder, setActiveChatOrder] = useState(null);

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log("Audio alert blocked.");
    }
  };

  useEffect(() => {
    if (!shopId) return;

    axios.get(`/api/orders/shop/${shopId}`)
      .then((res) => setOrders(res.data))
      .catch((err) => console.error(err));

    socket.on('NEW_ORDER', (newOrder) => {
      if (newOrder.shopId === shopId) {
        setOrders((prev) => [newOrder, ...prev]);
        playAlertSound();
      }
    });

    socket.on('ORDER_UPDATED', (updatedOrder) => {
      if (updatedOrder.shopId === shopId) {
        setOrders((prev) => prev.map((ord) => ord._id === updatedOrder._id ? updatedOrder : ord));
      }
    });

    return () => {
      socket.off('NEW_ORDER');
      socket.off('ORDER_UPDATED');
    };
  }, [shopId]);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await axios.patch(`/api/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((ord) => (ord._id === orderId ? res.data : ord)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFiles = async (orderId) => {
    if (!window.confirm("Permanently delete uploaded document and screenshot for privacy?")) return;
    try {
      const res = await axios.delete(`/api/orders/${orderId}/files`);
      setOrders((prev) => prev.map((ord) => ord._id === orderId ? res.data.order : ord));
    } catch (err) {
      alert("Failed to delete files.");
    }
  };

  const completedOrdersList = orders.filter((o) => o.status === 'COMPLETED');
  const todayCompletedOrders = completedOrdersList.filter((ord) => {
    return new Date(ord.updatedAt || ord.createdAt).toDateString() === new Date().toDateString();
  });

  const todayRevenue = todayCompletedOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  const totalRevenue = completedOrdersList.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);
  const avgOrderValue = todayCompletedOrders.length > 0 ? (todayRevenue / todayCompletedOrders.length).toFixed(1) : 0;
  const totalPagesPrinted = completedOrdersList.reduce((sum, ord) => sum + ((ord.pages || 1) * (ord.copies || 1)), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-4 mb-6 gap-4">
        <div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase border border-emerald-200">
            🟢 Vendor Operations & Revenue Panel
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Live Queue & Auto Revenue</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto text-xs">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-center shadow-sm">
            <p className="text-[9px] uppercase font-bold opacity-90">Today's Revenue</p>
            <p className="text-lg font-black mt-0.5">₹{todayRevenue}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
            <p className="text-[9px] text-emerald-800 uppercase font-bold">Total Earnings</p>
            <p className="text-lg font-black text-emerald-700 mt-0.5">₹{totalRevenue}</p>
          </div>
          <div className="bg-slate-50 border p-2.5 rounded-xl text-center">
            <p className="text-[9px] text-slate-500 uppercase font-bold">Avg Order Value</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">₹{avgOrderValue}</p>
          </div>
          <div className="bg-slate-50 border p-2.5 rounded-xl text-center">
            <p className="text-[9px] text-slate-500 uppercase font-bold">Pages Printed</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{totalPagesPrinted}</p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-center py-8 text-slate-500 text-xs">No active print orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div key={ord._id} className="p-4 border rounded-xl bg-slate-50 hover:border-emerald-300 transition">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">Order #{ord._id.slice(-6)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      ord.status === 'PRINTING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ord.status || 'PENDING'}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      PIN: {ord.pickupPin}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    Customer: <span className="font-semibold text-slate-900">{ord.customerName}</span> ({ord.customerPhone})
                  </p>
                  <p className="text-xs text-slate-600">
                    Pages: <span className="font-bold">{ord.pages}</span> | Copies: <span className="font-bold">{ord.copies}</span>
                  </p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">Order Amount: ₹{ord.totalAmount}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 md:mt-0">
                  {ord.fileUrl ? (
                    <a href={`http://localhost:5001${ord.fileUrl}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">
                      📄 Print File
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic px-2 py-1 bg-gray-100 rounded">
                      🗑 File Cleaned
                    </span>
                  )}

                  {ord.paymentScreenshotUrl && (
                    <a href={`http://localhost:5001${ord.paymentScreenshotUrl}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg">
                      🖼 Proof
                    </a>
                  )}

                  <button onClick={() => updateStatus(ord._id, 'PRINTING')} className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-lg">
                    Printing
                  </button>
                  <button onClick={() => updateStatus(ord._id, 'COMPLETED')} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                    Ready & Complete
                  </button>

                  {(ord.fileUrl || ord.paymentScreenshotUrl) && (
                    <button 
                      onClick={() => handleDeleteFiles(ord._id)} 
                      className="px-2.5 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold rounded-lg transition"
                      title="Delete files from server storage for privacy"
                    >
                      🗑 Delete Files
                    </button>
                  )}

                  <button onClick={() => setActiveChatOrder(activeChatOrder === ord._id ? null : ord._id)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">
                    💬 Chat
                  </button>
                </div>
              </div>

              {activeChatOrder === ord._id && (
                <LiveChat orderId={ord._id} currentUserRole="shopkeeper" customerName="Shopkeeper" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}