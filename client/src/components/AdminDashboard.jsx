import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard({ user }) {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [retentionStats, setRetentionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleanupMsg, setCleanupMsg] = useState('');

  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, shRes, usRes, retRes] = await Promise.all([
        axios.get('/api/admin/overview', config),
        axios.get('/api/admin/shops', config),
        axios.get('/api/admin/users', config),
        axios.get('/api/admin/retention-stats', config)
      ]);
      setOverview(ovRes.data.metrics);
      setShops(shRes.data);
      setUsers(usRes.data);
      setRetentionStats(retRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleShopStatus = async (shopId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await axios.patch(`/api/admin/shops/${shopId}/status`, { status: nextStatus }, config);
      setShops(prev => prev.map(s => s._id === shopId ? { ...s, status: nextStatus } : s));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update shop status.');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await axios.patch(`/api/admin/users/${userId}/status`, { status: nextStatus }, config);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: nextStatus } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleTriggerRetentionRun = async () => {
    setCleanupMsg('Running privacy retention worker...');
    try {
      const res = await axios.post('/api/admin/retention-run', {}, config);
      setCleanupMsg(`Cleanup complete: Processed ${res.data.processed} documents (${res.data.successCount} deleted, ${res.data.failureCount} failed).`);
      const retRes = await axios.get('/api/admin/retention-stats', config);
      setRetentionStats(retRes.data);
    } catch (err) {
      setCleanupMsg('Retention job execution failed.');
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-sm font-bold text-slate-500">Loading Platform Administration...</div>;
  }

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-950 px-3 py-1 rounded-full border border-blue-800">
            Platform Administration
          </span>
          <h1 className="text-2xl font-black mt-2">Printania Central Governance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor system operations, audit privacy retention, and moderate vendor hubs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAdminData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer ${tab === 'overview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
        >
          📊 System Overview
        </button>
        <button
          onClick={() => setTab('shops')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer ${tab === 'shops' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
        >
          🏪 Print Shops ({shops.length})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer ${tab === 'users' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
        >
          👥 Platform Users ({users.length})
        </button>
        <button
          onClick={() => setTab('privacy')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer ${tab === 'privacy' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
        >
          🔒 Privacy & Retention
        </button>
      </div>

      {/* Tab 1: Overview */}
      {tab === 'overview' && overview && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Users</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalUsers}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Shops</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalShops}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{overview.totalOrders}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live Queue</span>
            <p className="text-2xl font-black text-amber-600 mt-1">{overview.activeOrders}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{overview.completedOrders}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Platform Volume</span>
            <p className="text-2xl font-black text-indigo-600 mt-1">₹{overview.totalRevenue}</p>
          </div>
        </div>
      )}

      {/* Tab 2: Shops Management */}
      {tab === 'shops' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900">Registered Shop Partners</h3>
            <p className="text-xs text-slate-500">Audit tariffs, contact information, and account status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-6">Shop Name</th>
                  <th className="py-3 px-6">Owner</th>
                  <th className="py-3 px-6">Address</th>
                  <th className="py-3 px-6">Pricing</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {shops.map(shop => (
                  <tr key={shop._id} className="hover:bg-slate-50">
                    <td className="py-4 px-6 font-bold text-slate-900">{shop.shopName}</td>
                    <td className="py-4 px-6 text-slate-600">{shop.ownerName} ({shop.phone})</td>
                    <td className="py-4 px-6 text-slate-500 max-w-xs truncate">{shop.address}</td>
                    <td className="py-4 px-6">B&W: ₹{shop.pricing?.bwPerPage} • Color: ₹{shop.pricing?.colorPerPage}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        shop.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {shop.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleShopStatus(shop._id, shop.status || 'active')}
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition ${
                          shop.status === 'active' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {shop.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: User Management */}
      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900">Platform Accounts</h3>
            <p className="text-xs text-slate-500">Manage customer and vendor access permissions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-6">User Name</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Account Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="py-4 px-6 font-bold text-slate-900">{u.name}</td>
                    <td className="py-4 px-6 text-slate-600">{u.email}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u._id, u.status || 'active')}
                          className="px-3 py-1 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Privacy & Retention Audit */}
      {tab === 'privacy' && retentionStats && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h3 className="text-base font-black text-slate-900">Document Privacy Lifecycle Audit</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifies automatic deletion SLA (2 hours post-pickup). Uploaded confidential documents are never retained permanently.
              </p>
            </div>
            <button
              onClick={handleTriggerRetentionRun}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              🧹 Execute Retention Cleanup Now
            </button>
          </div>

          {cleanupMsg && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-xl">
              {cleanupMsg}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Documents</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{retentionStats.activeDocuments}</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Stored for active printing</span>
            </div>
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Permanently Deleted</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">{retentionStats.deletedDocuments}</p>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">Zero digital footprints</span>
            </div>
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
              <span className="text-[10px] font-bold text-amber-700 uppercase">Pending Deletion</span>
              <p className="text-2xl font-black text-amber-800 mt-1">{retentionStats.pendingDeletion}</p>
              <span className="text-[10px] text-amber-600 mt-0.5 block">Expired retention timer</span>
            </div>
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Retention SLA</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">{retentionStats.retentionPolicyHours} Hours</p>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Post-pickup cleanup SLA</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

