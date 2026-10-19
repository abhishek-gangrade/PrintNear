import React from 'react';

export default function Header({ user, currentView, onNavigate, onLogout }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
        
        {/* Brand Identity */}
        <button 
          onClick={() => onNavigate('landing')} 
          className="flex items-center gap-3 cursor-pointer group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            P
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
              Print<span className="text-blue-600">Near</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
              Hyperlocal Cloud Printing
            </span>
          </div>
        </button>

        {/* Floating Center Navigation Dock */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/80 p-1.5 rounded-2xl shadow-inner text-sm font-semibold">
          <button 
            onClick={() => onNavigate('landing')}
            className={`px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
              currentView === 'landing' || currentView === 'home'
                ? 'bg-white text-blue-600 font-bold shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Home
          </button>

          {(!user || user.role === 'customer') && (
            <button 
              onClick={() => onNavigate('shops')}
              className={`px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                currentView === 'shops' 
                  ? 'bg-white text-blue-600 font-bold shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Find Shops
            </button>
          )}

          {user?.role === 'shopkeeper' && (
            <button 
              onClick={() => onNavigate('dashboard')}
              className={`px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                currentView === 'dashboard' 
                  ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Vendor Portal
            </button>
          )}

          {user?.role === 'admin' && (
            <button 
              onClick={() => onNavigate('admin')}
              className={`px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                currentView === 'admin' 
                  ? 'bg-slate-900 text-white font-bold shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Admin Central
            </button>
          )}

          {user && user.role === 'customer' && (
            <button 
              onClick={() => onNavigate('my-orders')}
              className={`px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                currentView === 'my-orders' 
                  ? 'bg-white text-blue-600 font-bold shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              My Orders
            </button>
          )}

          {user && (
            <button 
              onClick={() => onNavigate('profile')}
              className={`px-5 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                currentView === 'profile' 
                  ? 'bg-white text-blue-600 font-bold shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Profile
            </button>
          )}
        </nav>

        {/* User Account Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                user.role === 'shopkeeper' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-xs' 
                  : 'bg-blue-50 text-blue-800 border-blue-200/80 shadow-xs'
              }`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${
                  user.role === 'shopkeeper' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                <span>{user.name}</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  ({user.role === 'shopkeeper' ? 'Vendor' : 'Student'})
                </span>
              </div>

              <button 
                onClick={onLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition-all duration-200 shadow-xs cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => onNavigate('login')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100/80 transition-all duration-200 cursor-pointer"
              >
                Sign In
              </button>
              <button 
                onClick={() => onNavigate('signup')}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/25 transition-all duration-200 cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}