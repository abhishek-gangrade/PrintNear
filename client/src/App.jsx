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

function App() {
  const [view, setView] = useState('landing');
  const [user, setUser] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('user');
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
    if (userData.role === 'shopkeeper') {
      setView('dashboard');
    } else {
      setView('shops');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header 
        user={user} 
        onNavigate={(page) => setView(page)} 
        onLogout={handleLogout} 
      />

      <main className="flex-1">
        {view === 'landing' && (
          <LandingPage onGetStarted={() => {
            if (!user) setView('signup');
            else if (user.role === 'shopkeeper') setView('dashboard');
            else setView('shops');
          }} />
        )}

        {(view === 'login' || view === 'signup') && (
          <Auth initialMode={view} onAuthSuccess={handleAuthSuccess} />
        )}

        {view === 'profile' && user && (
          <Profile user={user} onUpdateUser={(updated) => setUser(updated)} />
        )}

        {view === 'my-orders' && user && (
          <CustomerOrders user={user} />
        )}

        {view === 'shops' && (
          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ShopList onSelectShop={setSelectedShop} selectedShop={selectedShop} />
            {selectedShop ? (
              <OrderForm shop={selectedShop} user={user} />
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500 flex items-center justify-center min-h-[300px]">
                Select a nearby print shop on the left to begin your order.
              </div>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            {user?.shopId ? (
              <ShopDashboard shopId={user.shopId} />
            ) : (
              <div className="bg-white p-8 rounded-2xl shadow text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Shop Profile Found</h3>
                <p className="text-gray-600 mb-4">Please create a shop profile in your account settings.</p>
                <button 
                  onClick={() => setView('profile')} 
                  className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg"
                >
                  Go to Profile Settings
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;