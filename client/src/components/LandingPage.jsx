import React from 'react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
          ⚡ Fast On-Demand Printing
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mt-6 tracking-tight leading-tight">
          Print Your Documents <br />
          <span className="text-blue-600">Without Waiting in Queues</span>
        </h1>
        <p className="text-lg text-slate-600 mt-6 max-w-2xl mx-auto">
          Upload documents online, locate nearby campus print hubs, track order statuses live, and pick up using your unique secure PIN.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <button 
            onClick={onGetStarted} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition"
          >
            Order Print Now
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">What's New on PrintNear</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl mb-4">📍</div>
            <h3 className="font-bold text-xl mb-2">Live Map Discovery</h3>
            <p className="text-slate-600 text-sm">Find closest shops with exact B&W / Color rates and open status.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold text-xl mb-4">💬</div>
            <h3 className="font-bold text-xl mb-2">Real-Time Chat & Queue</h3>
            <p className="text-slate-600 text-sm">Direct Socket.IO messaging with shop owners & instant order state tracking.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 font-bold text-xl mb-4">🔒</div>
            <h3 className="font-bold text-xl mb-2">PIN Verified Pickups</h3>
            <p className="text-slate-600 text-sm">Four-digit confidential security code ensures only you pick up your order.</p>
          </div>
        </div>
      </section>
    </div>
  );
}