import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Profile({ user, onUpdateUser }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage({ text: '', type: '' });

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      const res = await axios.patch(
        '/api/auth/profile',
        { name, phone, email },
        config
      );

      const updatedData = res.data?.user || res.data;
      if (onUpdateUser) onUpdateUser(updatedData);

      localStorage.setItem('user', JSON.stringify(updatedData));
      setStatusMessage({
        text: 'Account details updated successfully!',
        type: 'success'
      });
    } catch (err) {
      setStatusMessage({
        text: err.response?.data?.message || 'Failed to update settings. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  return (
    <div className="relative font-sans text-slate-900 py-10 px-4 sm:px-6">
      {/* Ambient Gradient Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-blue-100/50 via-indigo-50/30 to-transparent pointer-events-none -z-10 rounded-full blur-3xl" />

      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Profile Card Header */}
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                {getInitials(name)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                {user?.role === 'shopkeeper' ? 'Verified Vendor Hub' : 'Campus Customer Account'}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{name || 'Your Account'}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{email || 'member@printnear.com'}</p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Role</span>
            <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-700 uppercase tracking-wide border border-slate-200">
              {user?.role || 'Customer'}
            </span>
          </div>
        </div>

        {/* Quick Highlights / Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">PIN Security</span>
              <span className="text-emerald-600 text-base">🛡️</span>
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">4-Digit PIN</p>
            <p className="text-[10px] text-slate-400">Secured for every print pickup</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Wallet</span>
              <span className="text-blue-600 text-base">⚡</span>
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">Direct UPI</p>
            <p className="text-[10px] text-slate-400">Zero commission local payouts</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Privacy</span>
              <span className="text-indigo-600 text-base">🧹</span>
            </div>
            <p className="text-lg font-black text-slate-900 mt-1">Auto-Purge</p>
            <p className="text-[10px] text-slate-400">Files wiped after completion</p>
          </div>
        </div>

        {/* Form Settings Container */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Personal Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Keep your contact information updated to receive live order status notifications.
            </p>
          </div>

          {statusMessage.text && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold border flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>{statusMessage.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  required
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.edu"
                required
                className="w-full bg-slate-50/70 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-mono"
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">
                Changes take effect across your orders immediately.
              </span>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 cursor-pointer"
              >
                {loading ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}