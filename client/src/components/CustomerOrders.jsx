import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LiveChat from './LiveChat';

export default function CustomerOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChatOrder, setActiveChatOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    axios.get('/api/orders/shop/all')
      .then((res) => {
        const myOrders = res.data.filter(
          (ord) => ord.customerName === user.name || ord.customerPhone === user.phone
        );
        setOrders(myOrders);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="text-center py-8 text-slate-500 text-xs">Loading your order history...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200 my-8">
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            🔵 Customer Dashboard
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">My Print Orders</h2>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-center py-8 text-slate-500 text-xs">You haven't placed any print orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div key={ord._id} className="p-4 border rounded-xl bg-slate-50 hover:border-blue-300 transition">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">Order #{ord._id.slice(-6)}</p>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      ord.status === 'PRINTING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ord.status || 'PENDING'}
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      PIN: {ord.pickupPin}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    Document: <span className="font-semibold text-slate-900">{ord.fileName}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Pages: <span className="font-bold">{ord.pages}</span> | Copies: <span className="font-bold">{ord.copies}</span> | Side: <span className="font-bold">{ord.printSide?.toUpperCase()}</span>
                  </p>
                  <p className="text-sm font-bold text-blue-600 mt-1">Total: ₹{ord.totalAmount}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveChatOrder(activeChatOrder === ord._id ? null : ord._id)} 
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-2xs"
                  >
                    💬 Live Chat with Shop
                  </button>
                </div>
              </div>

              {activeChatOrder === ord._id && (
                <LiveChat orderId={ord._id} currentUserRole="customer" customerName={user?.name} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}