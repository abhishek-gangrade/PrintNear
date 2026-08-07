import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Profile({ user, onUpdateUser }) {
  const isShopkeeper = user?.role === 'shopkeeper';

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bwPerPage, setBwPerPage] = useState('3');
  const [colorPerPage, setColorPerPage] = useState('10');
  
  const [minPages, setMinPages] = useState('10');
  const [discountBwRate, setDiscountBwRate] = useState('0.80');
  const [discountTiers, setDiscountTiers] = useState([]);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isShopkeeper && user?.shopId) {
      axios.get('/api/shops').then((res) => {
        const myShop = res.data.find((s) => s._id === user.shopId);
        if (myShop) {
          setShopName(myShop.shopName || '');
          setAddress(myShop.address || '');
          setUpiId(myShop.upiId || '');
          setBwPerPage(myShop.pricing?.bwPerPage || 3);
          setColorPerPage(myShop.pricing?.colorPerPage || 10);
          setDiscountTiers(myShop.discountTiers || []);
        }
      });
    }
  }, [user, isShopkeeper]);

  const handleAddTier = () => {
    if (!minPages || !discountBwRate) return;
    const newTier = { minPages: Number(minPages), bwRate: Number(discountBwRate) };
    setDiscountTiers([...discountTiers, newTier]);
    setMinPages('');
    setDiscountBwRate('');
  };

  const handleRemoveTier = (index) => {
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const userRes = await axios.patch('/api/auth/profile', {
        userId: user.id || user._id,
        name,
        email,
        phone
      });
      
      const updatedUser = { ...user, ...userRes.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdateUser(updatedUser);

      if (isShopkeeper && user?.shopId) {
        await axios.patch(`/api/shops/${user.shopId}`, {
          shopName,
          address,
          upiId,
          bwPerPage,
          colorPerPage,
          discountTiers
        });
      }

      setMessage('✓ Profile & UPI configuration updated successfully!');
    } catch (err) {
      setMessage('Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200 my-8">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
            isShopkeeper ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {isShopkeeper ? '🟢 Shopkeeper Account' : '🔵 Customer Account'}
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">Account Settings & Profile</h2>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 text-center">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Profile</p>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg p-2 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg p-2 text-xs" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg p-2 text-xs" />
        </div>

        {isShopkeeper && (
          <div className="border-t border-emerald-100 pt-4 mt-6 bg-emerald-50/50 p-4 rounded-xl space-y-4">
            <p className="text-xs font-bold text-emerald-800 uppercase">🟢 Shop Profile & Payment Settings</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Shop Name</label>
                <input type="text" required value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Shop Address</label>
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Shopkeeper UPI ID (GPay / Paytm / PhonePe)
              </label>
              <input 
                type="text" 
                required 
                placeholder="e.g. 9876543210@paytm or shop@okicici" 
                value={upiId} 
                onChange={(e) => setUpiId(e.target.value)} 
                className="w-full border rounded-lg p-2 text-xs bg-white font-mono font-bold" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Base B&W Rate (₹/pg)</label>
                <input type="number" step="0.1" value={bwPerPage} onChange={(e) => setBwPerPage(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Base Color Rate (₹/pg)</label>
                <input type="number" step="0.1" value={colorPerPage} onChange={(e) => setColorPerPage(e.target.value)} className="w-full border rounded-lg p-2 text-xs bg-white" />
              </div>
            </div>

            <div className="border-t border-emerald-200 pt-3">
              <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-2">Set Volume Discount Rules</label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  placeholder="Min Pages (e.g. 10)"
                  value={minPages}
                  onChange={(e) => setMinPages(e.target.value)}
                  className="w-1/2 border text-xs p-2 rounded-lg bg-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate ₹/pg (e.g. 0.80)"
                  value={discountBwRate}
                  onChange={(e) => setDiscountBwRate(e.target.value)}
                  className="w-1/2 border text-xs p-2 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="bg-emerald-700 text-white font-bold text-xs px-3 rounded-lg hover:bg-emerald-800"
                >
                  + Add
                </button>
              </div>

              {discountTiers.length > 0 && (
                <div className="space-y-1">
                  {discountTiers.map((tier, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 border rounded-lg text-xs">
                      <span className="text-slate-700">
                        📄 <strong>{tier.minPages}+ Pages</strong> → <strong className="text-emerald-700">₹{tier.bwRate}/pg</strong>
                      </span>
                      <button type="button" onClick={() => handleRemoveTier(idx)} className="text-red-500 font-bold hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full text-white font-bold py-3 rounded-xl text-xs transition shadow-md disabled:opacity-50 mt-4 ${
            isShopkeeper ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Saving...' : 'Update Settings'}
        </button>
      </form>
    </div>
  );
}