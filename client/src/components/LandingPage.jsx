import React from 'react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="font-sans text-slate-900 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Subtle Background Glow Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/50 via-indigo-50/30 to-transparent pointer-events-none -z-10 rounded-full blur-3xl" />

        <div className="max-w-5xl mx-auto px-6 text-center">
          
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-xs mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            <span className="text-xs font-bold tracking-wide uppercase text-blue-700">
              ⚡ Lightning-Fast Campus Printing
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Print Your Documents <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Without Waiting in Queues
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload files online, connect with nearby campus print hubs, track queue statuses in real time, and pick up securely via one-time PIN.
          </p>

          {/* CTA Actions */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              Order Print Now →
            </button>
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base border border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200 cursor-pointer"
            >
              Partner as a Vendor
            </button>
          </div>

          {/* Metric Stats Strip */}
          <div className="mt-14 pt-8 border-t border-slate-200/70 grid grid-cols-3 max-w-xl mx-auto gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-slate-900">0 min</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Queue Waiting</p>
            </div>
            <div className="border-x border-slate-200/70">
              <p className="text-2xl font-black text-blue-600">100%</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Privacy Auto-Wipe</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">Live</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Order Tracking</p>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Engineered for Fast Turnarounds
          </h2>
          <p className="text-sm text-slate-500 mt-2">Everything you need to print without handing over USBs or private chat links.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mb-6 shadow-inner">
              📍
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nearby Shop Discovery</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Auto-detect registered local print and xerox hubs, view active store queues, and pick the closest provider before heading out.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-6 shadow-inner">
              💬
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Live Order Sync & Chat</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Communicate directly with the vendor using order-linked live chat. Clarify binding, orientation, and specific page requests instantly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-200 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl mb-6 shadow-inner">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Zero-Retention Privacy</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Uploaded document files are automatically deleted after order pickup, keeping confidential notes and certificates secure.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}