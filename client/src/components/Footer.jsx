import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-3">PrintNear</h3>
          <p className="text-sm leading-relaxed">Connecting students and professionals with local print shops for fast, on-demand printing.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-white transition">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
            <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">For Partners</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-white transition">Register Shop</a></li>
            <li><a href="#" className="hover:text-white transition">Partner Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <p className="text-sm">Support: support@printnear.com</p>
          <p className="text-sm mt-1">Location: Campus Gate 1, Indore</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
        © 2026 PrintNear. All rights reserved.
      </div>
    </footer>
  );
}