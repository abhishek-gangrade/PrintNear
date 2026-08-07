import React, { useState } from 'react';
import axios from 'axios';

export default function Auth({ initialMode = 'login', onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [role, setRole] = useState('customer');
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    shopName: '',
    address: '',
    bwPerPage: '3',
    colorPerPage: '10'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isShopkeeper = role === 'shopkeeper';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('Fetching GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.longitude, pos.coords.latitude]);
        setLocationStatus(`✓ GPS Locked: [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`);
      },
      () => setLocationStatus('Failed to retrieve location. Defaulting to campus region.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email: formData.email, password: formData.password }
      : { ...formData, role, coordinates: coords };

    try {
      const res = await axios.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onAuthSuccess(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className={`bg-white p-8 rounded-2xl shadow-lg border-2 w-full max-w-md transition-all ${
        !isLogin && isShopkeeper ? 'border-emerald-500' : 'border-blue-500'
      }`}>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-1">
          {isLogin ? 'Welcome Back' : 'Join PrintNear Platform'}
        </h2>
        <p className="text-sm text-center text-gray-500 mb-6">
          {isLogin ? 'Sign in to access your dashboard' : 'Register as a customer or list your print shop'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Register As</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 text-sm font-bold rounded-lg border transition ${
                      role === 'customer' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    🔵 Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('shopkeeper')}
                    className={`py-2 text-sm font-bold rounded-lg border transition ${
                      role === 'shopkeeper' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    🟢 Shopkeeper
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Your Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2.5 text-sm"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              {isShopkeeper && (
                <div className="border-t border-emerald-200 pt-3 mt-3 bg-emerald-50/50 p-3 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-emerald-700 uppercase">🟢 Print Shop Location & Details</p>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Shop Name</label>
                    <input
                      type="text"
                      name="shopName"
                      required
                      value={formData.shopName}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2 text-sm bg-white"
                      placeholder="e.g. Express Printing Hub"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Address / Landmark</label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full border rounded-lg p-2 text-sm bg-white"
                      placeholder="e.g. Gate 2, University Campus"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="w-full bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg hover:bg-emerald-800 transition"
                    >
                      📍 Capture Exact GPS Location
                    </button>
                    {locationStatus && <p className="text-[10px] text-emerald-800 font-bold mt-1 text-center">{locationStatus}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">B&W Rate (₹/pg)</label>
                      <input
                        type="number"
                        name="bwPerPage"
                        value={formData.bwPerPage}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Color Rate (₹/pg)</label>
                      <input
                        type="number"
                        name="colorPerPage"
                        value={formData.colorPerPage}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2.5 text-sm"
                  placeholder="9876543210"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full border rounded-lg p-2.5 text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full border rounded-lg p-2.5 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-3 rounded-lg text-sm transition shadow-md disabled:opacity-50 mt-2 ${
              !isLogin && isShopkeeper ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : isShopkeeper ? 'Register Shopkeeper' : 'Register Customer'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already registered? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-blue-600 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}