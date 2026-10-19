import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import LiveChat from './LiveChat';
import QueueTrackerBadge from './QueueTrackerBadge';

export default function CustomerOrders({ user, onNavigateToShops }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchMyOrders();
  }, [user]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    const token = localStorage.getItem('token');
    if (!userId || !token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('ORDER_STATUS_UPDATED', updatedOrder => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
    });

    socket.on('PAYMENT_STATUS_UPDATED', updatedOrder => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? { ...o, ...updatedOrder } : o));
    });

    return () => socket.disconnect();
  }, [user?.id, user?._id]);

  const fetchMyOrders = async () => {
    const userId = user?.id || user?._id;
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.get(`/api/orders/user/${userId}`, config);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      setError('Could not retrieve your orders. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/orders/${orderId}/cancel`, { reason: 'Customer requested cancellation' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchMyOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleViewDocument = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/orders/${orderId}/document`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(fileUrl, '_blank');
    } catch (err) {
      let errorMsg = 'Document is no longer accessible or has been deleted.';
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PickedUp':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">✓ Picked Up</span>;
      case 'Cancelled':
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">{status}</span>;
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ready for Pickup
          </span>
        );
      case 'Printing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Printing Now
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            In Queue ({status || 'Pending'})
          </span>
        );
    }
  };

  return (
    <div className="relative font-sans text-slate-900 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Live Order Tracker
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Print Orders</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track print status, retrieve your counter pickup PIN, and chat with local vendors in real time.
            </p>
          </div>

          <button
            onClick={fetchMyOrders}
            className="self-start sm:self-center px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh Status
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Syncing with print servers...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 sm:p-16 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
              📄
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-extrabold text-slate-900">No active print orders</h3>
              <p className="text-xs text-slate-500 mt-1">
                You haven't dispatched any print jobs yet. Choose a nearby print shop and send your documents without waiting in line.
              </p>
            </div>
            {onNavigateToShops && (
              <button
                onClick={onNavigateToShops}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Find Nearby Print Shops →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const shopInfo = order.shopId || {};
              const shopTitle = shopInfo.shopName || 'Local Print Shop';
              const shopLoc = shopInfo.address || 'Nearby Location';
              const canCancel = ['Pending', 'Quoted', 'Accepted', 'Queued'].includes(order.status);

              return (
                <div
                  key={order._id}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-5"
                >
                  {/* Top Details Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                        🖨️
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{shopTitle}</h3>
                        <p className="text-[11px] text-slate-500">{shopLoc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(order.status)}
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{order._id ? order._id.slice(-6) : '------'}
                      </span>
                    </div>
                  </div>

                  {/* Print Specifications Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Print Volume</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {order.pages || 1} Pgs × {order.copies || 1} Copies ({order.paperSize || 'A4'})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Color & Layout</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {order.colorType || 'B&W'} • {order.orientation || 'Portrait'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sides & Binding</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {order.printSides || 'Single'}-Sided • {order.binding || 'None'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Paid</span>
                      <span className="font-black text-emerald-700 text-sm mt-0.5 block">
                        ₹{order.totalAmount || 0}
                      </span>
                    </div>
                  </div>

                  <QueueTrackerBadge orderId={order._id} />

                  {/* Customer Notes */}
                  {order.customerNotes && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3 text-xs text-blue-950 flex items-start gap-2">
                      <span className="font-bold text-blue-700 uppercase text-[10px] tracking-wider shrink-0 mt-0.5">
                        Your Note:
                      </span>
                      <p className="italic text-slate-700 font-medium">"{order.customerNotes}"</p>
                    </div>
                  )}

                  {/* Privacy Status Notice */}
                  {order.deletionStatus === 'Deleted' ? (
                    <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                      <span>🔒</span> Original document permanently wiped from server per privacy retention SLA.
                    </div>
                  ) : null}

                  {/* Bottom Strip: Pickup PIN & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 gap-4">
                    {order.pickupPin ? (
                      <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 px-4 py-2 rounded-2xl">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                            Counter Pickup PIN
                          </p>
                          <p className="text-[10px] text-emerald-600">Show this PIN to claim prints</p>
                        </div>
                        <span className="font-mono text-xl font-black text-emerald-700 tracking-wider">
                          {order.pickupPin}
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {order.deletionStatus !== 'Deleted' && (
                        <button
                          onClick={() => handleViewDocument(order._id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          👁️ View File
                        </button>
                      )}

                      {canCancel && (
                        <button
                          disabled={actionLoading[order._id]}
                          onClick={() => handleCancelOrder(order._id)}
                          className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          ✕ Cancel
                        </button>
                      )}

                      <button
                        onClick={() => setActiveChatOrder(order._id)}
                        className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        💬 Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Chat Modal */}
      {activeChatOrder && (
        <LiveChat
          orderId={activeChatOrder}
          currentUser={user}
          onClose={() => setActiveChatOrder(null)}
        />
      )}
    </div>
  );
}