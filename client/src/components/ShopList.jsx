import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Default Shop Icon
const ShopIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Distinct Blue User Icon for Live Customer Location
const UserIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

L.Marker.prototype.options.icon = ShopIcon;

function RecenterMap({ userPos, shops }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (userPos) points.push(userPos);
    shops.forEach((s) => {
      if (s.location?.coordinates) {
        points.push([s.location.coordinates[1], s.location.coordinates[0]]);
      }
    });

    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
    }
  }, [userPos, shops, map]);
  return null;
}

export default function ShopList({ onSelectShop, selectedShop }) {
  const [shops, setShops] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);

  const indoreCenter = [22.7196, 75.8577];

  useEffect(() => {
    // Get customer's live location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => console.log("User geolocation denied.")
      );
    }

    axios.get('/api/shops')
      .then((res) => {
        setShops(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-500 text-xs">Locating nearby print hubs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Nearby Print Shops ({shops.length})</h2>
        <div className="flex items-center gap-2">
          {userPos && <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">🔵 Your Location Active</span>}
          <span className="text-xs bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full">● Live Map</span>
        </div>
      </div>

      <div className="h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
        <MapContainer center={indoreCenter} zoom={13} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap userPos={userPos} shops={shops} />

          {/* Customer Live Position Marker */}
          {userPos && (
            <Marker position={userPos} icon={UserIcon}>
              <Popup>
                <div className="text-xs font-bold text-blue-600">🔵 You are here</div>
              </Popup>
            </Marker>
          )}

          {/* Registered Shops Pins */}
          {shops.map((s) => {
            const lat = s.location?.coordinates[1];
            const lng = s.location?.coordinates[0];
            if (!lat || !lng) return null;

            return (
              <Marker key={s._id} position={[lat, lng]} icon={ShopIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{s.shopName}</p>
                    <p className="text-gray-600 mb-2">{s.address}</p>
                    <button 
                      onClick={() => onSelectShop(s)}
                      className="w-full bg-blue-600 text-white font-bold px-2 py-1 rounded text-[10px]"
                    >
                      Select Shop
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {shops.map((s) => (
          <div
            key={s._id}
            onClick={() => onSelectShop(s)}
            className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
              selectedShop?._id === s._id 
                ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20' 
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{s.shopName}</h3>
              <p className="text-xs text-slate-500">{s.address}</p>
              <div className="flex gap-3 mt-2 text-[11px]">
                <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                  B&W: ₹{s.pricing?.bwPerPage || 3}/pg
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                  Color: ₹{s.pricing?.colorPerPage || 10}/pg
                </span>
              </div>
            </div>

            <button className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
              selectedShop?._id === s._id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
            }`}>
              {selectedShop?._id === s._id ? 'Selected' : 'Select Shop'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}