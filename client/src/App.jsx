import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import ShopList from './components/ShopList';
import OrderForm from './components/OrderForm';
import ShopDashboard from './components/ShopDashboard';
import Profile from './components/Profile';
import CustomerOrders from './components/CustomerOrders';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

  // Restore session from localStorage on initial load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSelectedShop(null);
    setView('landing');
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    if (userData.role === 'admin') {
      setView('admin');
    } else if (userData.role === 'shopkeeper') {
      setView('dashboard');
    } else {
      setView('shops');
    }
  };

  const handleNavigate = (page) => {
    if (page === 'home' || page === 'landing') {
      setView('landing');
    } else {
      setView(page);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <Header 
        user={user} 
        currentView={view} 
        onNavigate={handleNavigate} 
        onLogout={handleLogout} 
      />

      <main className="flex-1">
        {/* Landing / Home View */}
        {(view === 'landing' || view === 'home') && (
          <LandingPage 
            onGetStarted={() => {
              if (!user) setView('signup');
              else if (user.role === 'admin') setView('admin');
              else if (user.role === 'shopkeeper') setView('dashboard');
              else setView('shops');
            }} 
          />
        )}

        {/* Authentication (Login / Signup) */}
        {(view === 'login' || view === 'signup') && (
          <Auth initialMode={view} onAuthSuccess={handleAuthSuccess} />
        )}

        {/* Customer Shops Listing & Order Booking */}
        {view === 'shops' && (
          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ShopList onSelectShop={setSelectedShop} selectedShop={selectedShop} />
            {selectedShop ? (
              <OrderForm shop={selectedShop} user={user} />
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-xs border border-slate-200 text-center text-slate-500 flex flex-col items-center justify-center min-h-[350px]">
                <span className="text-3xl mb-2">🏪</span>
                <p className="font-bold text-slate-800">Select a print shop</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pick a shop from the nearby list or map on the left to configure your print job.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vendor Dashboard */}
        {view === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <ShopDashboard user={user} />
          </div>
        )}

        {/* Platform Admin Central */}
        {view === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            {user?.role === 'admin' ? (
              <AdminDashboard user={user} />
            ) : (
              <div className="bg-white p-8 rounded-3xl text-center text-xs text-red-500 font-bold border border-red-200">
                Access Denied: Platform Administrator rights required.
              </div>
            )}
          </div>
        )}

        {/* Customer Orders */}
        {view === 'my-orders' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            {user ? (
              <CustomerOrders 
                user={user} 
                onNavigateToShops={() => setView('shops')} 
              />
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-xs border border-slate-200 text-center text-xs text-slate-500">
                Please{' '}
                <button 
                  onClick={() => setView('login')} 
                  className="text-blue-600 font-bold underline cursor-pointer"
                >
                  sign in
                </button>{' '}
                to view your orders.
              </div>
            )}
          </div>
        )}

        {/* Profile Settings */}
        {view === 'profile' && (
          <div className="max-w-3xl mx-auto px-4 py-8">
            {user ? (
              <Profile 
                user={user} 
                onUpdateUser={(updated) => setUser(updated)} 
              />
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-xs border border-slate-200 text-center text-xs text-slate-500">
                Please{' '}
                <button 
                  onClick={() => setView('login')} 
                  className="text-blue-600 font-bold underline cursor-pointer"
                >
                  sign in
                </button>{' '}
                to view your profile.
              </div>
            )}
          </div>
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}