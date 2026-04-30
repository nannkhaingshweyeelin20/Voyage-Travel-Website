import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { geminiService, HotelResult } from '../lib/gemini';
import { googlePlacesService, serpApiPlacesService } from '../lib/places';
import { itineraryService } from '../lib/services';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Star, MapPin, Bed, Loader2, AlertCircle, Plus, X, Check, Wifi, DollarSign } from 'lucide-react';
import { resolvePlaceImage } from '../lib/images';

function placeImg(keyword: string, i: number) {
  return resolvePlaceImage({ imageKeyword: keyword }, i);
}

export default function HotelPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialDest = (routerLocation.state as any)?.city
    || (routerLocation.state as any)?.to
    || '';

  const [destination, setDestination] = useState(initialDest);
  const [inputValue, setInputValue] = useState(initialDest);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [itineraries, setItineraries] = useState<any[]>([]);
  const [addModal, setAddModal] = useState<HotelResult | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    itineraryService.getByUser(user.uid).then(setItineraries).catch(console.error);
  }, [user]);

  const fetchHotels = useCallback(async (dest: string) => {
    if (!dest.trim()) return;
    setLoading(true);
    setError(false);
    setHasSearched(true);
    try {
      // Try Google Places first
      const places = await googlePlacesService.searchHotels(dest);
      if (places.length > 0) {
        setHotels(places.map(p => ({
          id: p.id, name: p.name, address: p.address, rating: p.rating,
          pricePerNight: p.pricePerNight, currency: p.currency, stars: p.stars,
          imageKeyword: p.image || p.photoUrl || p.imageKeyword, amenities: p.amenities,
        })));
        return;
      }
      const serpPlaces = await serpApiPlacesService.searchHotels(dest);
      if (serpPlaces.length > 0) {
        setHotels(serpPlaces.map(p => ({
          id: p.id, name: p.name, address: p.address, rating: p.rating,
          pricePerNight: p.pricePerNight, currency: p.currency, stars: p.stars,
          imageKeyword: p.image || p.photoUrl || p.imageKeyword, amenities: p.amenities,
        })));
        return;
      }
      // Fallback to Gemini
      const data = await geminiService.getHotelsByDestination(dest);
      setHotels(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialDest) fetchHotels(initialDest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setDestination(trimmed);
    setHotels([]);
    fetchHotels(trimmed);
  };

  const handleAddToTrip = async (itineraryId: string) => {
    if (!addModal) return;
    setAddingId(itineraryId);
    try {
      await itineraryService.addItem(itineraryId, {
        placeId: addModal.id,
        notes: `🏨 ${addModal.name} — ${addModal.address} (${destination})`,
        price: addModal.pricePerNight,
        currency: addModal.currency,
      });
      setAddedId(itineraryId);
      setTimeout(() => { setAddModal(null); setAddedId(null); }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Hero with background image */}
      <section className="relative overflow-hidden pt-32 pb-24 px-6">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80"
            alt="Hotel" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-purple-900/70 to-indigo-900/80" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-purple-300 text-sm font-semibold uppercase tracking-widest">
            AI Hotel Discovery
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="text-5xl md:text-6xl font-black text-white leading-tight">
            Find Your Perfect Stay
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="text-slate-300 text-lg">
            Discover top-rated hotels curated by AI — from budget to luxury.
          </motion.p>

          <motion.form initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            onSubmit={handleSearch} className="flex gap-3 mt-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search hotels by destination (e.g. Tokyo, Bali, Paris…)"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
              />
            </div>
            <button type="submit" disabled={loading || !inputValue.trim()}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-7 py-4 rounded-2xl font-bold text-sm transition shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </motion.form>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {['Tokyo', 'Paris', 'Bali', 'Singapore', 'New York', 'Dubai'].map((city) => (
              <button key={city} type="button"
                onClick={() => { setInputValue(city); setDestination(city); setHotels([]); fetchHotels(city); }}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white text-xs font-semibold transition">
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Not searched yet */}
        {!hasSearched && (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-400">
            <Bed size={52} strokeWidth={1.2} className="text-purple-300" />
            <p className="text-lg font-semibold text-slate-600">Search for hotels in any city</p>
            <p className="text-sm">AI will find top-rated options with prices, ratings, and amenities.</p>
            <button onClick={() => navigate('/destinations')}
              className="mt-2 text-sm text-purple-600 underline underline-offset-4">
              Or explore all destinations →
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden border border-slate-200 bg-white animate-pulse">
                <div className="h-56 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                  <div className="h-3 bg-slate-200 rounded-full w-1/2" />
                  <div className="h-3 bg-slate-200 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <AlertCircle size={48} className="text-rose-400" />
            <p className="font-semibold text-slate-700">Could not load hotels</p>
            <p className="text-sm text-slate-400">Check your connection or API key.</p>
            <button onClick={() => fetchHotels(destination)}
              className="mt-2 px-6 py-2.5 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 transition">
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && !error && hasSearched && (
          <>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Results</p>
                <h2 className="text-2xl font-black text-slate-900">
                  {hotels.length} hotels in{' '}
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{destination}</span>
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                <Bed size={16} className="text-purple-600" />
                {hotels.length} hotels found
              </div>
            </div>

            {hotels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Bed size={44} strokeWidth={1.2} />
                <p>No hotels found for this destination.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {hotels.map((hotel, i) => (
                  <motion.div
                    key={hotel.id || i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-shadow"
                  >
                    <div className="relative h-56 overflow-hidden bg-slate-100">
                      <img
                        src={placeImg(hotel.imageKeyword, i)}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-0.5">
                        {Array.from({ length: Math.min(5, Math.max(1, Math.round(hotel.stars || 3))) }).map((_, s) => (
                          <Star key={s} size={12} className="text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <button
                        onClick={() => setAddModal(hotel)}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white transition shadow"
                      >
                        <Plus size={13} /> Add to trip
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{hotel.name}</h3>
                        <span className="inline-flex items-center gap-1 text-amber-500 font-semibold text-sm shrink-0">
                          <Star size={13} fill="currentColor" />{hotel.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                        <MapPin size={11} /> {hotel.address}
                      </p>
                      {hotel.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {hotel.amenities.slice(0, 3).map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                              <Wifi size={9} /> {a}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-lg font-bold text-purple-600">
                            {hotel.currency} {hotel.pricePerNight.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500"> / night</span>
                        </div>
                        <button
                          onClick={() => setAddModal(hotel)}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:shadow-lg hover:shadow-purple-500/25 transition"
                        >
                          <Bed size={12} /> Book
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add to trip modal */}
      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-slate-900">Add to trip</h3>
                <button onClick={() => setAddModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 text-sm mb-6">
                Adding <span className="font-semibold text-slate-900">{addModal.name}</span>
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-6">
                {itineraries.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-sm">No trips yet — create one in My Trips first.</p>
                ) : itineraries.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => handleAddToTrip(it.id)}
                    disabled={!!addingId || addedId === it.id}
                    className={`w-full p-4 text-left rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                      addedId === it.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{it.title}</p>
                      {it.destination && <p className="text-xs text-slate-500 mt-0.5">{it.destination}</p>}
                    </div>
                    {addingId === it.id ? <Loader2 size={16} className="animate-spin text-purple-500 shrink-0" />
                      : addedId === it.id ? <Check size={16} className="text-emerald-500 shrink-0" />
                      : <Plus size={16} className="text-slate-400 shrink-0" />}
                  </button>
                ))}
              </div>
              <button onClick={() => setAddModal(null)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-full font-semibold text-sm hover:bg-slate-200 transition">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
