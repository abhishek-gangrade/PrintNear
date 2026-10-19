import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet marker icon issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const shopPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function ShopList({ onSelectShop, selectedShop }) {
  const [shops, setShops] = useState([]);
  const [userCoords, setUserCoords] = useState([22.7196, 75.8577]);
  const [loading, setLoading] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('best_match');

  useEffect(() => {
    const load = async () => {
      let coords = [22.7196, 75.8577];
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
          );
          coords = [pos.coords.latitude, pos.coords.longitude];
          setUserCoords(coords);
        } catch {}
      }
      await fetchRecommendedShops(coords, sortBy);
    };
    load();
  }, [sortBy]);

  const fetchRecommendedShops = async (coords = userCoords, sortMode = sortBy) => {
    setLoading(true);
    try {
      const [lat, lng] = coords;
      const res = await axios.get(`/api/shops/recommend?lat=${lat}&lng=${lng}&maxDistance=10000&sortBy=${sortMode}`);
      const shopData = Array.isArray(res.data) ? res.data : [];
      setShops(shopData);
      if (shopData.length > 0 && !selectedShop) onSelectShop(shopData[0]);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      // Fallback to standard nearby endpoint
      try {
        const [lat, lng] = coords;
        const fallback = await axios.get(`/api/shops/nearby?lat=${lat}&lng=${lng}&maxDistance=5000`);
        setShops(Array.isArray(fallback.data) ? fallback.data : []);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Smart Shop Recommendations ({shops.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranked by distance, price, live queue, and estimated pickup time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Live AI Ranking
          </span>
        </div>
      </div>

      {/* Sort Filter Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setSortBy('best_match')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            sortBy === 'best_match' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🎯 Best Match
        </button>
        <button
          onClick={() => setSortBy('nearest')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            sortBy === 'nearest' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📍 Nearest
        </button>
        <button
          onClick={() => setSortBy('lowest_price')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            sortBy === 'lowest_price' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🏷️ Lowest Price
        </button>
        <button
          onClick={() => setSortBy('fastest')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            sortBy === 'fastest' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⚡ Fastest Pickup
        </button>
      </div>

      {/* Embedded Map Card */}
      <div className="relative group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="h-60 w-full">
          <MapContainer center={userCoords} zoom={14} scrollWheelZoom={false} className="h-full w-full z-0">
            <MapResizer />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={userCoords} icon={userPinIcon}>
              <Popup>
                <div className="font-sans text-xs">
                  <strong className="text-blue-600">You Are Here</strong>
                  <p className="text-slate-500 text-[10px]">Your Search Location</p>
                </div>
              </Popup>
            </Marker>

            {shops.map((shop) => {
              const coords = shop.location?.coordinates;
              const lat = coords ? coords[1] : userCoords[0] + 0.005;
              const lng = coords ? coords[0] : userCoords[1] + 0.005;

              return (
                <Marker key={shop._id} position={[lat, lng]} icon={shopPinIcon}>
                  <Popup>
                    <div className="font-sans text-xs space-y-1">
                      <p className="font-bold text-slate-900">{shop.shopName}</p>
                      <p className="text-[11px] text-slate-500">{shop.address}</p>
                      <p className="text-[11px] font-semibold text-emerald-600">
                        B&W: ₹{shop.pricing?.bwPerPage ?? 3}/pg • Color: ₹{shop.pricing?.colorPerPage ?? 10}/pg
                      </p>
                      <button
                        onClick={() => onSelectShop(shop)}
                        className="mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-lg text-[10px] cursor-pointer"
                      >
                        Select This Shop
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setIsMapExpanded(true)}
            className="bg-white/95 hover:bg-white text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md border border-slate-200 backdrop-blur-xs flex items-center gap-1.5 transition cursor-pointer hover:scale-102"
          >
            <span>⛶</span> Expand Map
          </button>
        </div>
      </div>

      {/* Multi-Factor Recommendation Listing Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs font-semibold text-slate-400">
            Evaluating multi-factor shop rankings (distance, price, queue, completion times)...
          </div>
        ) : shops.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-400">
            No registered print shops found within the service area.
          </div>
        ) : (
          shops.map((shop, index) => {
            const isSelected = selectedShop?._id === shop._id;

            return (
              <div
                key={shop._id}
                onClick={() => onSelectShop(shop)}
                className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm text-slate-900">{shop.shopName}</h3>
                    {shop.recommendationScore && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {shop.recommendationScore}% Match
                      </span>
                    )}
                    {index === 0 && sortBy === 'best_match' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Top Pick
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">{shop.address}</p>

                  {/* Explainability Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {(shop.highlightBadges || []).map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Operational Metrics Row */}
                  <div className="flex items-center gap-3 pt-1 text-xs font-semibold text-slate-600 flex-wrap">
                    <span>
                      Dist: <strong className="text-slate-900">{shop.distanceKm || (shop.distanceMeters ? (shop.distanceMeters / 1000).toFixed(2) : 0.5)} km</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Est. Time: <strong className="text-slate-900">~{shop.estimatedMinutes || 4} mins</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Rates: <strong className="text-slate-900">₹{shop.pricing?.bwPerPage ?? 3}/pg</strong>
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated</span>
                    <p className="text-sm font-black text-slate-900">₹{shop.estimatedPrice || shop.pricing?.bwPerPage || 3}</p>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FULLSCREEN EXPANDED MAP MODAL */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Campus Map Explorer</h3>
                <p className="text-xs text-slate-500">Pan and inspect nearby print shops</p>
              </div>
              <button
                onClick={() => setIsMapExpanded(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 w-full relative">
              <MapContainer center={userCoords} zoom={15} scrollWheelZoom={true} className="h-full w-full z-0">
                <MapResizer />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={userCoords} icon={userPinIcon}>
                  <Popup>
                    <div className="font-sans text-xs">
                      <strong className="text-blue-600">Your Current Location</strong>
                    </div>
                  </Popup>
                </Marker>

                {shops.map((shop) => {
                  const coords = shop.location?.coordinates;
                  const lat = coords ? coords[1] : userCoords[0] + 0.005;
                  const lng = coords ? coords[0] : userCoords[1] + 0.005;

                  return (
                    <Marker key={shop._id} position={[lat, lng]} icon={shopPinIcon}>
                      <Popup>
                        <div className="font-sans text-xs space-y-1.5 p-1">
                          <p className="font-bold text-slate-900 text-sm">{shop.shopName}</p>
                          <p className="text-[11px] text-slate-500">{shop.address}</p>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
                            Rates: ₹{shop.pricing?.bwPerPage ?? 3} (B&W) • ₹{shop.pricing?.colorPerPage ?? 10} (Color)
                          </div>
                          <button
                            onClick={() => {
                              onSelectShop(shop);
                              setIsMapExpanded(false);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer shadow-xs mt-1"
                          >
                            Select & Order Here
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}