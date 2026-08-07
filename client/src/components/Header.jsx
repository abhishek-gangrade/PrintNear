import React from 'react';

export default function Header({ user, onNavigate, onLogout }) {
  const isShopkeeper = user?.role === 'shopkeeper';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl">P</div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PrintNear</span>
        </div>

        <nav className="flex items-center gap-6">
          <button onClick={() => onNavigate('landing')} className="text-gray-600 hover:text-blue-600 font-medium transition">Home</button>
          
          {user?.role === 'shopkeeper' ? (
            <button onClick={() => onNavigate('dashboard')} className="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              Vendor Dashboard
            </button>
          ) : (
            <button onClick={() => onNavigate('shops')} className="text-gray-600 hover:text-blue-600 font-medium transition">Find Shops</button>
          )}

          {!isShopkeeper && user && (
            <button onClick={() => onNavigate('my-orders')} className="text-gray-600 hover:text-blue-600 font-medium transition">
              My Orders
            </button>
          )}

          {user && (
            <button onClick={() => onNavigate('profile')} className="text-gray-600 hover:text-blue-600 font-medium transition">
              Profile
            </button>
          )}
          
          {user ? (
            <div className="flex items-center gap-4">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${
                isShopkeeper 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}>
                ● {user.name} ({isShopkeeper ? 'Shopkeeper' : 'Customer'})
              </span>
              <button onClick={onLogout} className="text-sm text-red-600 hover:underline font-medium">Logout</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={() => onNavigate('login')} className="text-blue-600 font-semibold px-4 py-2 hover:bg-blue-50 rounded-lg transition">Login</button>
              <button onClick={() => onNavigate('signup')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition shadow-md">Sign Up</button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}