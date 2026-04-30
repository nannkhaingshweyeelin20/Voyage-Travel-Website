import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../lib/AuthContext';
import { bookingService, itineraryService, favoritesService, destinationService, type Booking, type Destination, type FavoriteItem } from '../lib/services.ts';
import {
  geminiService,
  FlightResult,
  HotelResult,
  RestaurantResult,
  AttractionResult,
} from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Star,
  MapPin,
  Plus,
  X,
  Loader2,
  Hotel,
  UtensilsCrossed,
  Landmark,
  AlertCircle,
  Bed,
  Clock,
  DollarSign,
  Wifi,
  Check,
  Heart,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Waves,
  Building2,
  Trees,
  Globe,
  Filter,
  Compass,
  CalendarCheck,
  Users,
  CheckCircle2,
  Plane,
  Navigation,
} from 'lucide-react';
import { handleImageError, resolvePlaceImage } from '../lib/images';

/* ── helpers ─────────────────────────────────────────────── */
function placeImg(keyword: string, index: number) {
  return resolvePlaceImage({ imageKeyword: keyword }, index);
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-500 font-semibold text-sm">
      <Star size={13} fill="currentColor" />
      {rating.toFixed(1)}
    </span>
  );
}

/* ── tab types ───────────────────────────────────────────── */
type Tab = 'all' | 'hotels' | 'restaurants' | 'attractions' | 'flights';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All Results', icon: Search },
  { key: 'hotels', label: 'Hotels', icon: Hotel },
  { key: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { key: 'attractions', label: 'Places to Visit', icon: Landmark },
  { key: 'flights', label: 'Flights', icon: Plane },
];

// Helper function to assign tags to destinations based on category and name
function getDestinationTags(name: string, category: string): ('Beach' | 'Countryside' | 'City' | 'Adventure')[] {
  const tags: ('Beach' | 'Countryside' | 'City' | 'Adventure')[] = [];
  
  // Primary tag based on category
  if (category === 'Beach') tags.push('Beach');
  else if (category === 'City') tags.push('City');
  else if (category === 'Nature') tags.push('Countryside');
  else if (category === 'Adventure') tags.push('Adventure');
  
  // Secondary tags based on destination name/characteristics
  const nameLower = name.toLowerCase();
  if (nameLower.includes('island') || nameLower.includes('coast') || nameLower.includes('beach') || 
      nameLower.includes('bay') || nameLower.includes('sea') || nameLower.includes('maldives') ||
      nameLower.includes('bali') || nameLower.includes('phuket') || nameLower.includes('boracay') ||
      nameLower.includes('santorini') || nameLower.includes('mykonos') || nameLower.includes('zanzibar')) {
    if (!tags.includes('Beach')) tags.push('Beach');
  }
  
  if (nameLower.includes('mountain') || nameLower.includes('alps') || nameLower.includes('forest') ||
      nameLower.includes('lake') || nameLower.includes('national') || nameLower.includes('garden') ||
      nameLower.includes('nature') || nameLower.includes('valley') || nameLower.includes('fjord')) {
    if (!tags.includes('Countryside')) tags.push('Countryside');
  }
  
  if (nameLower.includes('adventure') || nameLower.includes('trek') || nameLower.includes('safari') ||
      nameLower.includes('hiking') || nameLower.includes('cave') || nameLower.includes('hike') ||
      nameLower.includes('bungee') || nameLower.includes('canyon') || nameLower.includes('serengeti') ||
      nameLower.includes('patagonia') || nameLower.includes('interlaken')) {
    if (!tags.includes('Adventure')) tags.push('Adventure');
  }
  
  return tags.length > 0 ? tags : [category === 'Nature' ? 'Countryside' : category === 'Adventure' ? 'Adventure' : category as any];
}

type DestCatalogItem = {
  id: string;
  name: string;
  country: string;
  city: string;
  type: 'hotel' | 'restaurant' | 'attraction';
  category: 'Beach' | 'City' | 'Nature' | 'Adventure';
  rating: number;
  description: string;
  image: string;
  location: string;
};

function splitDestinationLocation(location?: string) {
  const parts = (location || '').split(',').map((part) => part.trim()).filter(Boolean);
  return {
    city: parts[0] || location || 'Destination',
    country: parts[1] || parts[0] || 'Destination',
  };
}

function inferDestinationCategory(destination: Destination): DestCatalogItem['category'] {
  const lower = `${destination.name} ${destination.description} ${destination.location}`.toLowerCase();
  if (lower.includes('beach') || lower.includes('island') || lower.includes('coast') || lower.includes('sea') || lower.includes('bay')) return 'Beach';
  if (lower.includes('adventure') || lower.includes('trek') || lower.includes('hike') || lower.includes('safari') || lower.includes('cave') || lower.includes('desert')) return 'Adventure';
  if (lower.includes('mountain') || lower.includes('forest') || lower.includes('park') || lower.includes('garden') || lower.includes('lake') || lower.includes('nature')) return 'Nature';
  return 'City';
}

function formatCatalogDescription(city: string, typeCounts: Record<DestCatalogItem['type'], number>) {
  const segments = [
    typeCounts.hotel > 0 ? `${typeCounts.hotel} hotel${typeCounts.hotel === 1 ? '' : 's'}` : null,
    typeCounts.restaurant > 0 ? `${typeCounts.restaurant} restaurant${typeCounts.restaurant === 1 ? '' : 's'}` : null,
    typeCounts.attraction > 0 ? `${typeCounts.attraction} place${typeCounts.attraction === 1 ? '' : 's'} to visit` : null,
  ].filter(Boolean);

  return segments.length > 0
    ? `${segments.join(', ')} in ${city}.`
    : `Explore ${city}.`;
}

function buildCatalogItems(destinations: Destination[]): DestCatalogItem[] {
  const grouped = new Map<string, Destination[]>();

  for (const destination of destinations) {
    const location = splitDestinationLocation(destination.location);
    const key = `${location.city}||${location.country}`.toLowerCase();
    const existing = grouped.get(key);
    if (existing) {
      existing.push(destination);
    } else {
      grouped.set(key, [destination]);
    }
  }

  return Array.from(grouped.values())
    .map((group, index) => {
      const sample = [...group].sort((left, right) => right.rating - left.rating)[0];
      const location = splitDestinationLocation(sample.location);
      const category = inferDestinationCategory(sample);
      const typeCounts = group.reduce<Record<DestCatalogItem['type'], number>>((accumulator, item) => {
        accumulator[item.type] += 1;
        return accumulator;
      }, { hotel: 0, restaurant: 0, attraction: 0 });
      const primaryType = (Object.entries(typeCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || sample.type) as DestCatalogItem['type'];

      return {
        id: `place-${location.city}-${location.country}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: location.city,
        city: location.city,
        country: location.country,
        type: primaryType,
        category,
        rating: Math.max(...group.map((item) => item.rating)),
        description: formatCatalogDescription(location.city, typeCounts),
        image: resolvePlaceImage({
          name: location.city,
          location: sample.location,
          type: sample.type,
          imageUrl: sample.imageUrl,
        }, index),
        location: sample.location,
      };
    })
    .sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name));
}

function mapDestinationToHotel(destination: Destination, index: number): HotelResult {
  return {
    id: destination.id,
    name: destination.name,
    address: destination.location || 'Destination',
    rating: destination.rating,
    pricePerNight: Number((destination.priceRange.match(/\d+(?:\.\d+)?/) || ['180'])[0]),
    currency: 'USD',
    stars: Math.max(3, Math.min(5, Math.round(destination.rating))),
    imageKeyword: destination.imageUrl || destination.name,
    amenities: ['Free WiFi', 'Breakfast', 'Great Location'].slice(0, 2 + (index % 2)),
  };
}

function mapDestinationToRestaurant(destination: Destination): RestaurantResult {
  return {
    id: destination.id,
    name: destination.name,
    cuisine: inferDestinationCategory(destination) === 'Beach' ? 'Seafood' : 'Local Cuisine',
    address: destination.location || 'Destination',
    rating: destination.rating,
    priceRange: destination.priceRange || '$$',
    imageKeyword: destination.imageUrl || destination.name,
    openHours: '11:00-22:00',
  };
}

function mapDestinationToAttraction(destination: Destination): AttractionResult {
  return {
    id: destination.id,
    name: destination.name,
    description: destination.description || `A must-visit place in ${destination.location || 'this destination'}.`,
    location: destination.location || 'Destination',
    category: inferDestinationCategory(destination),
    imageKeyword: destination.imageUrl || destination.name,
    entryFee: destination.priceRange || 'Free',
    duration: '1-3 hrs',
  };
}

/* ── "add to trip" modal ─────────────────────────────────── */
interface AddToTripModalProps {
  itemName: string;
  itemType: Tab;
  itemId: string;
  itineraries: any[];
  defaultDestination?: string;
  onClose: () => void;
  onAdd: (itineraryId: string) => Promise<void>;
  onTripCreated?: (trip: any) => void;
}

function AddToTripModal({ itemName, itineraries, onClose, onAdd, onTripCreated, defaultDestination }: AddToTripModalProps) {
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({ title: '', destination: defaultDestination || '', startDate: '', endDate: '' });
  const { user } = useAuth();

  const handleAdd = async (id: string) => {
    setAdding(id);
    try {
      await onAdd(id);
      setAdded(id);
      setTimeout(onClose, 1200);
    } catch {
      /* handled by caller */
    } finally {
      setAdding(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setCreateError('');
    try {
      const result = await itineraryService.create({
        ...createForm,
        userId: user.uid,
        days: [],
        status: 'draft',
      });
      const newId = (result as any)?.id;
      if (newId) {
        const newTrip = { ...createForm, id: newId, userId: user.uid, days: [], status: 'draft', createdAt: new Date() };
        onTripCreated?.(newTrip);
        setCreateForm({ title: '', destination: '', startDate: '', endDate: '' });
        setShowCreate(false);
        setAdded(null);
        // Automatically add the place to the new trip
        await handleAdd(newId);
      }
    } catch {
      setCreateError('Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">
              {showCreate ? 'New trip' : 'Add to trip'}
            </p>
            <h3 className="text-2xl font-black text-slate-900">
              {showCreate ? 'Plan your next adventure' : 'Choose a trip'}
            </h3>
          </div>
          <button 
            onClick={showCreate ? () => { setShowCreate(false); setCreateError(''); } : onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {showCreate ? (
          // CREATE TRIP FORM (same design as Itinerary page)
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Trip Title</label>
              <input
                type="text" required
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Summer in Japan"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Destination</label>
              <input
                type="text" required
                value={createForm.destination}
                onChange={e => setCreateForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="Tokyo, Japan"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Start Date</label>
                <input
                  type="date" required
                  value={createForm.startDate}
                  onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">End Date</label>
                <input
                  type="date" required
                  value={createForm.endDate}
                  onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>
            {createError && (
              <p className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <AlertCircle size={13} />{createError}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-4">
              After creating, <span className="font-semibold text-slate-900">{itemName}</span> will be added to this trip.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-60 hover:shadow-lg hover:shadow-purple-500/25 transition"
              >
                {creating ? 'Creating…' : 'Create Trip'}
              </button>
            </div>
          </form>
        ) : (
          // TRIP SELECTION VIEW
          <>
            <p className="text-slate-500 text-sm mb-4">
              Adding <span className="font-semibold text-slate-900">{itemName}</span> to:
            </p>

            <div className="space-y-2 mb-4">
              {itineraries.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <p className="mb-3">No trips yet</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {itineraries.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => handleAdd(it.id)}
                      disabled={!!adding || added === it.id}
                      className={`w-full p-3 text-left rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                        added === it.id
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{it.title}</p>
                        {it.destination && <p className="text-xs text-slate-500 mt-0.5 truncate">{it.destination}</p>}
                      </div>
                      {adding === it.id ? (
                        <Loader2 size={16} className="animate-spin text-purple-500 shrink-0" />
                      ) : added === it.id ? (
                        <Check size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Plus size={16} className="text-slate-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CREATE TRIP BUTTON */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/25 text-white text-sm font-bold transition"
            >
              <Plus size={16} /> Create New Trip
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
            >
              Close
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── destination catalog card (for browse sections) ─────── */
function DestCatalogCard({
  item,
  onSelect,
}: {
  item: DestCatalogItem;
  onSelect: (location: string) => void;
}) {
  const catColor: Record<string, string> = {
    Beach:     'bg-sky-500/90',
    City:      'bg-purple-600/90',
    Nature:    'bg-emerald-600/90',
    Adventure: 'bg-amber-600/90',
    International: 'bg-indigo-600/90',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => onSelect(item.location)}
      className="group relative w-[200px] md:w-[240px] rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-2xl transition-shadow text-left shrink-0"
    >
      <div className="h-[160px] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3.5">
        <p className="text-white font-black text-sm leading-tight">{item.name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-white/80 text-[10px]">{item.country}</p>
          <p className="text-amber-400 text-[10px] font-bold">★ {item.rating.toFixed(1)}</p>
        </div>
      </div>
      <span className={`absolute top-3 left-3 text-white text-[9px] font-bold px-2 py-0.5 rounded-full ${catColor[item.category] || 'bg-slate-700'}`}>
        {item.category}
      </span>
    </motion.button>
  );
}

function DestHSection({
  title,
  subtitle,
  items,
  onSelect,
  icon: SectionIcon,
}: {
  title: string;
  subtitle: string;
  items: DestCatalogItem[];
  onSelect: (location: string) => void;
  icon: React.ElementType;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'l' | 'r') =>
    scrollRef.current?.scrollBy({ left: dir === 'r' ? 280 : -280, behavior: 'smooth' });

  if (items.length === 0) return null;
  return (
    <div className="mb-14">
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
            <SectionIcon size={12} /> {title}
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">{subtitle}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => scroll('l')} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll('r')} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {items.map((item) => (
          <DestCatalogCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/* ── hotel card ──────────────────────────────────────────── */
function HotelCard({
  hotel,
  index,
  onAdd,
  onBook,
  onFlight,
  onView,
  wishlisted,
  onToggleWishlist,
}: {
  hotel: HotelResult;
  index: number;
  onAdd: (hotel: HotelResult) => void;
  onBook: (hotel: HotelResult) => void;
  onFlight: (hotel: HotelResult) => void;
  onView: (hotel: HotelResult) => void;
  wishlisted: boolean;
  onToggleWishlist: (hotel: HotelResult) => void;
}) {
  const stars = Math.min(5, Math.max(1, Math.round(hotel.stars || 3)));
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onView(hotel)}
    >
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={placeImg(hotel.imageKeyword, index)}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-0.5">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
          ))}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(hotel); }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:scale-110 transition-transform shadow"
        >
          <Heart size={16} className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-500'} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(hotel); }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white transition shadow"
        >
          <Plus size={13} /> Add to trip
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-slate-900 text-base leading-tight">{hotel.name}</h3>
          <StarRow rating={hotel.rating} />
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
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onFlight(hotel); }}
              className="flex items-center gap-1.5 border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-sky-100 transition"
            >
              <Plane size={12} /> Flight
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onBook(hotel); }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:shadow-lg hover:shadow-purple-500/25 transition"
            >
              <Bed size={12} /> Book
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── restaurant card ─────────────────────────────────────── */
function RestaurantCard({
  restaurant,
  index,
  onAdd,
  onFlight,
  onReserve,
  onView,
  wishlisted,
  onToggleWishlist,
}: {
  restaurant: RestaurantResult;
  index: number;
  onAdd: (r: RestaurantResult) => void;
  onFlight: (r: RestaurantResult) => void;
  onReserve: (r: RestaurantResult) => void;
  onView: (r: RestaurantResult) => void;
  wishlisted: boolean;
  onToggleWishlist: (r: RestaurantResult) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onView(restaurant)}
    >
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={placeImg(restaurant.imageKeyword, index)}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-3 py-1 rounded-full">
          {restaurant.cuisine}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(restaurant); }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:scale-110 transition-transform shadow"
        >
          <Heart size={16} className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-500'} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(restaurant); }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white transition shadow"
        >
          <Plus size={13} /> Add to trip
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-slate-900 text-base leading-tight">{restaurant.name}</h3>
          <StarRow rating={restaurant.rating} />
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500 mb-1">
          <MapPin size={11} /> {restaurant.address}
        </p>
        <p className="flex items-center gap-1 text-xs text-slate-500 mb-3">
          <Clock size={11} /> {restaurant.openHours}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-500">
            <DollarSign size={14} /> {restaurant.priceRange}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onFlight(restaurant); }}
              className="flex items-center gap-1.5 border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-sky-100 transition"
            >
              <Plane size={12} /> Flight
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReserve(restaurant); }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:shadow-lg hover:shadow-rose-500/25 transition"
            >
              <CalendarCheck size={12} /> Reserve
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── attraction card ─────────────────────────────────────── */
function AttractionCard({
  attraction,
  index,
  onAdd,
  onFlight,
  onVisit,
  onView,
  wishlisted,
  onToggleWishlist,
}: {
  attraction: AttractionResult;
  index: number;
  onAdd: (a: AttractionResult) => void;
  onFlight: (a: AttractionResult) => void;
  onVisit: (a: AttractionResult) => void;
  onView: (a: AttractionResult) => void;
  wishlisted: boolean;
  onToggleWishlist: (a: AttractionResult) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => onView(attraction)}
    >
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={placeImg(attraction.imageKeyword, index)}
          alt={attraction.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold px-3 py-1 rounded-full">
          {attraction.category}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(attraction); }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:scale-110 transition-transform shadow"
        >
          <Heart size={16} className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-500'} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(attraction); }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white transition shadow"
        >
          <Plus size={13} /> Add to trip
        </button>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">{attraction.name}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500 mb-2">
          <MapPin size={11} /> {attraction.location}
        </p>
        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{attraction.description}</p>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><DollarSign size={11} />{attraction.entryFee}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{attraction.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onFlight(attraction); }}
              className="flex items-center gap-1.5 border border-sky-200 bg-sky-50 text-sky-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-sky-100 transition"
            >
              <Plane size={12} /> Flight
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onVisit(attraction); }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition"
            >
              <MapPin size={12} /> Visit
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultPageNav({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button onClick={onPrev} disabled={page === 1}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
        <ChevronLeft size={15} /> Prev
      </button>
      <span className="text-sm font-medium text-slate-600">Page {page} of {total}</span>
      <button onClick={onNext} disabled={page === total}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ── skeleton loader ─────────────────────────────────────── */
function SkeletonGrid() {
  return (
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
  );
}

/* ── error / empty state ─────────────────────────────────── */
function EmptyState({ message, icon: Icon }: { message: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-400">
      <Icon size={48} strokeWidth={1.2} />
      <p className="text-base">{message}</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-4 text-slate-500">
      <AlertCircle size={48} strokeWidth={1.2} className="text-rose-400" />
      <p className="font-semibold text-slate-700">Something went wrong</p>
      <p className="text-sm text-slate-400">Could not load results. Check your connection or API key.</p>
      <button
        onClick={onRetry}
        className="mt-2 px-6 py-2.5 bg-purple-600 text-white rounded-full text-sm font-semibold hover:bg-purple-700 transition"
      >
        Try Again
      </button>
    </div>
  );
}

/* ── section header ──────────────────────────────────────── */
function SectionHeader({
  count,
  label,
  destination,
  gradient,
}: {
  count: number;
  label: string;
  destination: string;
  gradient: string;
}) {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Results</p>
        <h2 className="text-2xl font-black text-slate-900">
          {count} {label} in{' '}
          <span className={`bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {destination}
          </span>
        </h2>
      </div>
    </div>
  );
}

function stopLabel(stops: number) {
  return stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`;
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Destinations() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Support ?q= from header search, ?category= from home page, ?location= from home page, ?tag= for tag-based filtering
  const urlParams = new URLSearchParams(routerLocation.search);
  const urlQuery = urlParams.get('q') || '';
  const urlCategory = urlParams.get('category') as 'Beach' | 'City' | 'Nature' | 'Adventure' | null;
  const urlLocation = urlParams.get('location') || '';
  const urlTag = urlParams.get('tag') as 'Beach' | 'Countryside' | 'City' | 'Adventure' | null;

  const [destination, setDestination] = useState(
    urlQuery || urlLocation || (routerLocation.state as any)?.to || ''
  );
  const [inputValue, setInputValue] = useState(destination);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [nearYouEnabled, setNearYouEnabled] = useState(false);
  const [catalogCountryFilter, setCatalogCountryFilter] = useState('all');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<'all' | 'hotel' | 'restaurant' | 'attraction'>('all');
  const [catalogMinRating, setCatalogMinRating] = useState<number>(0);
  const [catalogItems, setCatalogItems] = useState<DestCatalogItem[]>([]);

  // All-Destinations section pagination + search
  const DEST_PAGE_SIZE = 9;
  const [destPage, setDestPage] = useState(1);
  const [destSearch, setDestSearch] = useState('');
  const [destCategoryFilter, setDestCategoryFilter] = useState<'all' | 'Beach' | 'City' | 'Nature' | 'Adventure'>(
    urlCategory || 'all'
  );

  // Derived: filtered destination catalog for All Destinations grid
  const destFiltered = useMemo(() => {
    const q = destSearch.toLowerCase();
    const locFilter = urlLocation.toLowerCase();
    return catalogItems.filter(d => {
      const tags = getDestinationTags(d.name, d.category);
      const matchSearch = !q || d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q) || d.location.toLowerCase().includes(q);
      const matchLoc = !locFilter || d.name.toLowerCase().includes(locFilter) || d.location.toLowerCase().includes(locFilter);
      const matchCat = destCategoryFilter === 'all' || d.category === destCategoryFilter;
      const matchTag = !urlTag || tags.includes(urlTag);
      return matchSearch && matchLoc && matchCat && matchTag;
    });
  }, [catalogItems, destSearch, destCategoryFilter, urlLocation, urlTag]);

  const destTotalPages = Math.ceil(destFiltered.length / DEST_PAGE_SIZE);
  const destPageItems = destFiltered.slice((destPage - 1) * DEST_PAGE_SIZE, destPage * DEST_PAGE_SIZE);

  const [resultCategoryFilter, setResultCategoryFilter] = useState<'all' | 'hotel' | 'restaurant' | 'attraction'>('all');
  const [resultMinRating, setResultMinRating] = useState<number>(0);
  const [resultMaxPrice, setResultMaxPrice] = useState<number>(9999);

  // Booking modal (Hotel)
  const [bookingModal, setBookingModal] = useState<HotelResult | null>(null);
  const [bookingForm, setBookingForm] = useState({ checkIn: '', checkOut: '', guests: 1 });
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  // Reserve modal (Restaurant)
  const [reserveModal, setReserveModal] = useState<RestaurantResult | null>(null);
  const [reserveForm, setReserveForm] = useState({ date: '', time: '19:00', people: 2 });
  const [reserveDone, setReserveDone] = useState(false);
  // Visit modal (Attraction)
  const [visitModal, setVisitModal] = useState<AttractionResult | null>(null);
  // Flight modal
  const [flightModal, setFlightModal] = useState<string | null>(null); // destination
  const [flightFrom, setFlightFrom] = useState('');
  const [flightDep, setFlightDep] = useState('');
  const [flightRet, setFlightRet] = useState('');
  const [flightSearched, setFlightSearched] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState('');
  const [flightNotice, setFlightNotice] = useState('');
  const [selectedFlight, setSelectedFlight] = useState<FlightResult | null>(null);
  const [flightBookingSubmitting, setFlightBookingSubmitting] = useState(false);
  const [flightBookingDone, setFlightBookingDone] = useState(false);
  const [confirmedFlightBooking, setConfirmedFlightBooking] = useState<Booking | null>(null);
  const [flightCancelling, setFlightCancelling] = useState(false);
  const [confirmedHotelBooking, setConfirmedHotelBooking] = useState<Booking | null>(null);
  const [confirmedRestaurantBooking, setConfirmedRestaurantBooking] = useState<Booking | null>(null);
  const [hotelCancelling, setHotelCancelling] = useState(false);
  const [restaurantCancelling, setRestaurantCancelling] = useState(false);
  const [flightPlaceContext, setFlightPlaceContext] = useState<{ placeId?: string; placeName: string; destination: string } | null>(null);
  // Search results pagination
  const RESULT_PAGE_SIZE = 6;
  const [hotelPage, setHotelPage] = useState(1);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [attractionPage, setAttractionPage] = useState(1);

  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantResult[]>([]);
  const [attractions, setAttractions] = useState<AttractionResult[]>([]);

  const makeMockFlights = (fromValue: string, toValue: string, dateValue: string): FlightResult[] => {
    const fromCode = fromValue.trim().slice(0, 3).toUpperCase() || 'RGN';
    const toCode = toValue.trim().slice(0, 3).toUpperCase() || 'BKK';
    return [
      {
        id: `mock-${fromCode}-${toCode}-1`,
        airline: 'Sandbox Airways',
        code: 'SB',
        flightNumber: 'SB 201',
        from: fromValue,
        fromCode,
        to: toValue,
        toCode,
        departTime: `${dateValue} 08:15`,
        arriveTime: `${dateValue} 10:05`,
        duration: '1h 50m',
        stops: 0,
        price: 149,
        currency: 'USD',
        type: 'Mock',
      },
      {
        id: `mock-${fromCode}-${toCode}-2`,
        airline: 'Voyage Air',
        code: 'VA',
        flightNumber: 'VA 412',
        from: fromValue,
        fromCode,
        to: toValue,
        toCode,
        departTime: `${dateValue} 13:40`,
        arriveTime: `${dateValue} 15:35`,
        duration: '1h 55m',
        stops: 0,
        price: 176,
        currency: 'USD',
        type: 'Mock',
      },
    ];
  };

  const [loadingTab, setLoadingTab] = useState(false);
  const [errorTab, setErrorTab] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [itineraries, setItineraries] = useState<any[]>([]);
  const [addModalItem, setAddModalItem] = useState<{
    id: string; name: string; type: Tab;
    imageUrl?: string; location?: string;
    raw: HotelResult | RestaurantResult | AttractionResult;
  } | null>(null);

  // Wishlist / favorites
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [favToast, setFavToast] = useState<{ msg: string; added: boolean } | null>(null);

  const openFlightSearch = (target?: { destination?: string; placeId?: string; placeName?: string } | string) => {
    const nextDestination = typeof target === 'string' ? target : target?.destination || destination;
    const nextPlaceName = typeof target === 'string' ? target : target?.placeName || nextDestination;
    setFlightModal(nextDestination);
    setFlightPlaceContext({
      destination: nextDestination,
      placeId: typeof target === 'string' ? undefined : target?.placeId,
      placeName: nextPlaceName,
    });
    setFlightSearched(false);
    setFlightResults([]);
    setFlightError('');
    setFlightNotice('');
    setSelectedFlight(null);
    setFlightBookingDone(false);
    setConfirmedFlightBooking(null);
    setFlightCancelling(false);
  };

  const handleFlightSearch = async () => {
    const target = flightModal || destination;
    if (!flightFrom.trim() || !target.trim() || !flightDep) {
      setFlightError('Enter departure, destination, and departure date.');
      setFlightSearched(false);
      return;
    }

    setFlightLoading(true);
    setFlightError('');
    setFlightNotice('');
    setFlightResults([]);

    try {
      const results = await geminiService.searchFlights(flightFrom.trim(), target.trim(), flightDep, {
        returnDate: flightRet || undefined,
        currency: 'USD',
        hl: 'en',
      });
      setFlightResults(results);
      setFlightSearched(true);
      if (results.length === 0) {
        setFlightError('No flights found for this route.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load flights right now.';
      const fallback = makeMockFlights(flightFrom.trim(), target.trim(), flightDep);
      setFlightNotice('Live flight search failed. Showing mock flight options instead.');
      setFlightResults(fallback);
      setFlightSearched(true);
      setFlightError(message);
    } finally {
      setFlightLoading(false);
    }
  };

  const closeFlightBookingModal = () => {
    setSelectedFlight(null);
    setFlightBookingSubmitting(false);
    setFlightBookingDone(false);
    setConfirmedFlightBooking(null);
    setFlightCancelling(false);
    setFlightPlaceContext(null);
  };

  const handleConfirmFlightBooking = async () => {
    if (!selectedFlight || !user) {
      return;
    }

    setFlightBookingSubmitting(true);
    try {
      const result = await bookingService.createWithTrip({
        userId: user.uid,
        itineraryId: '',
        placeId: flightPlaceContext?.placeId,
        placeName: flightPlaceContext?.placeName || selectedFlight.to,
        bookingType: 'flight',
        destination: selectedFlight.to,
        tripTitle: `Trip to ${selectedFlight.to}`,
        flightName: `${selectedFlight.airline} ${selectedFlight.flightNumber}`,
        hotelName: `${selectedFlight.airline} ${selectedFlight.flightNumber}`,
        location: `${selectedFlight.fromCode} -> ${selectedFlight.toCode}`,
        imageUrl: undefined,
        checkIn: selectedFlight.departTime.slice(0, 10),
        checkOut: (flightRet || selectedFlight.departTime.slice(0, 10)),
        guests: 1,
        flightDetails: {
          airline: selectedFlight.airline,
          flightNumber: selectedFlight.flightNumber,
          from: selectedFlight.from,
          fromCode: selectedFlight.fromCode,
          to: selectedFlight.to,
          toCode: selectedFlight.toCode,
          departTime: selectedFlight.departTime,
          arriveTime: selectedFlight.arriveTime,
          duration: selectedFlight.duration,
        },
        totalPrice: selectedFlight.price,
        currency: selectedFlight.currency,
        status: 'confirmed',
      });
      setConfirmedFlightBooking(result.booking);
      setFlightBookingDone(true);
    } catch (error) {
      setFavToast({ msg: 'Could not save flight booking', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } finally {
      setFlightBookingSubmitting(false);
    }
  };

  const handleCancelFlightBooking = async () => {
    if (!confirmedFlightBooking) {
      return;
    }

    setFlightCancelling(true);
    try {
      await bookingService.updateStatus(confirmedFlightBooking.id, 'cancelled');
      setConfirmedFlightBooking((current: Booking | null) => current ? { ...current, status: 'cancelled' } : current);
      setFavToast({ msg: 'Flight booking cancelled', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } catch {
      setFavToast({ msg: 'Could not cancel flight booking', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } finally {
      setFlightCancelling(false);
    }
  };

  const handleCancelHotelBooking = async () => {
    if (!confirmedHotelBooking) {
      return;
    }

    setHotelCancelling(true);
    try {
      await bookingService.updateStatus(confirmedHotelBooking.id, 'cancelled');
      setConfirmedHotelBooking((current: Booking | null) => current ? { ...current, status: 'cancelled' } : current);
      setFavToast({ msg: 'Hotel booking cancelled', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } catch {
      setFavToast({ msg: 'Could not cancel hotel booking', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } finally {
      setHotelCancelling(false);
    }
  };

  const handleCancelRestaurantBooking = async () => {
    if (!confirmedRestaurantBooking) {
      return;
    }

    setRestaurantCancelling(true);
    try {
      await bookingService.updateStatus(confirmedRestaurantBooking.id, 'cancelled');
      setConfirmedRestaurantBooking((current: Booking | null) => current ? { ...current, status: 'cancelled' } : current);
      setFavToast({ msg: 'Restaurant reservation cancelled', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } catch {
      setFavToast({ msg: 'Could not cancel restaurant reservation', added: false });
      setTimeout(() => setFavToast(null), 2500);
    } finally {
      setRestaurantCancelling(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    favoritesService.getAll().then((items: FavoriteItem[]) => {
      setWishlistIds(new Set(items.map((item: FavoriteItem) => item.id)));
    }).catch(() => {});
  }, [user]);

  const toggleWishlist = async (item: HotelResult | RestaurantResult | AttractionResult, type: Tab) => {
    if (!user) {
      navigate('/login', { state: { from: '/destinations' } });
      return;
    }
    const id = (item as any).id || (item as any).name;
    const imgKw = (item as any).imageKeyword || '';
    const wasAdded = wishlistIds.has(id);
    // Optimistic UI update
    setWishlistIds(prev => {
      const next = new Set(prev);
      wasAdded ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (wasAdded) {
        await favoritesService.remove(id);
        setFavToast({ msg: 'Removed from favorites', added: false });
      } else {
        await favoritesService.save({
          id,
          title: (item as any).name,
          city: destination,
          country: '',
          imageUrl: placeImg(imgKw, 0),
          price: (item as any).pricePerNight || 0,
          currency: (item as any).currency || 'USD',
          rating: (item as any).rating || 0,
          propertyType: type === 'hotels' ? 'hotel' : type === 'restaurants' ? 'restaurant' : 'attraction',
        });
        setFavToast({ msg: 'Added to favorites!', added: true });
      }
    } catch {
      // Revert optimistic update on failure
      setWishlistIds(prev => {
        const next = new Set(prev);
        wasAdded ? next.add(id) : next.delete(id);
        return next;
      });
      setFavToast({ msg: 'Could not update favorites', added: false });
    }
    // Dismiss toast
    setTimeout(() => setFavToast(null), 2500);
  };

  // Detail popup
  type DetailItem = { name: string; imageUrl: string; location: string; rating: number; description: string; type: Tab; raw: HotelResult | RestaurantResult | AttractionResult };
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  const openDetail = (item: HotelResult | RestaurantResult | AttractionResult, type: Tab) => {
    const addr = (item as any).address || (item as any).location || destination;
    const imgKw = (item as any).imageKeyword || '';
    setDetailItem({
      name: (item as any).name,
      imageUrl: placeImg(imgKw, 0),
      location: addr,
      rating: (item as any).rating || 0,
      description: (item as any).description || (type === 'hotels'
        ? `${(item as any).stars || 4}-star hotel with ${(item as any).amenities?.join(', ') || 'premium amenities'}.`
        : type === 'restaurants'
          ? `${(item as any).cuisine} restaurant. Open: ${(item as any).openHours || 'N/A'}`
          : ''),
      type,
      raw: item,
    });
  };

  const searchSuggestions = [
    ...new Set(
      catalogItems.flatMap((d) => [d.name, d.location])
    ),
  ]
    .filter((s) => !inputValue || s.toLowerCase().includes(inputValue.toLowerCase()))
    .slice(0, 8);

  const filteredCatalog = catalogItems.filter((item) => {
    const matchCountry = catalogCountryFilter === 'all' || item.country === catalogCountryFilter;
    const matchType = catalogTypeFilter === 'all' || item.type === catalogTypeFilter;
    const matchRating = item.rating >= catalogMinRating;
    return matchCountry && matchType && matchRating;
  });

  const loadCatalog = useCallback(async () => {
    try {
      const data = await destinationService.search({ limit: 250 });
      setCatalogItems(buildCatalogItems(data));
    } catch {
      setCatalogItems([]);
    }
  }, []);

  const loadDestinationResults = useCallback(async (dest: string, tab: Tab = 'all') => {
    if (!dest.trim()) return;

    setLoadingTab(true);
    setErrorTab(false);
    setHasSearched(true);

    try {
      const data = await destinationService.search({ query: dest, limit: 120 });
      const hotelsData = data.filter((item) => item.type === 'hotel').map(mapDestinationToHotel);
      const restaurantsData = data.filter((item) => item.type === 'restaurant').map(mapDestinationToRestaurant);
      const attractionsData = data.filter((item) => item.type === 'attraction').map(mapDestinationToAttraction);

      if (tab === 'all' || tab === 'hotels') setHotels(hotelsData);
      if (tab === 'all' || tab === 'restaurants') setRestaurants(restaurantsData);
      if (tab === 'all' || tab === 'attractions') setAttractions(attractionsData);
    } catch {
      setErrorTab(true);
      if (tab === 'all' || tab === 'hotels') setHotels([]);
      if (tab === 'all' || tab === 'restaurants') setRestaurants([]);
      if (tab === 'all' || tab === 'attractions') setAttractions([]);
    } finally {
      setLoadingTab(false);
    }
  }, []);

  /* load user itineraries */
  useEffect(() => {
    if (!user) return;
    itineraryService.getByUser(user.uid).then(setItineraries).catch(console.error);
  }, [user]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /* auto-search whenever ?q= param changes (including initial load) */
  useEffect(() => {
    const q = new URLSearchParams(routerLocation.search).get('q') || '';
    if (!q) return;
    if (q !== destination) {
      setDestination(q);
      setInputValue(q);
    }
    setHotelPage(1); setRestaurantPage(1); setAttractionPage(1);
    void loadDestinationResults(q, 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.search, loadDestinationResults]);

  const handleEnableNearYou = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setNearYouEnabled(true),
      () => setNearYouEnabled(false),
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  const fetchTab = useCallback(async (tab: Tab, dest: string) => {
    if (tab === 'flights') return;
    await loadDestinationResults(dest, tab);
  }, [loadDestinationResults]);

  const fetchAll = useCallback(async (dest: string) => {
    setActiveTab('all');
    await loadDestinationResults(dest, 'all');
  }, [loadDestinationResults]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setDestination(trimmed);
    setHotels([]);
    setRestaurants([]);
    setAttractions([]);
    setHotelPage(1); setRestaurantPage(1); setAttractionPage(1);
    void fetchAll(trimmed);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'all') {
      setResultCategoryFilter('all');
      setResultMinRating(0);
      setResultMaxPrice(9999);
    }
    // Flights tab is standalone — no fetching needed
    if (tab === 'flights') return;
    if (tab === 'all' && destination) {
      void fetchAll(destination);
      return;
    }
    const hasData =
      (tab === 'hotels' && hotels.length > 0) ||
      (tab === 'restaurants' && restaurants.length > 0) ||
      (tab === 'attractions' && attractions.length > 0);
    if (!hasData && destination) {
      setHasSearched(true);
      void fetchTab(tab, destination);
    }
  };

  /* add to itinerary */
  const handleConfirmAdd = async (itineraryId: string) => {
    if (!addModalItem) return;
    const emoji = addModalItem.type === 'hotels' ? '🏨' : addModalItem.type === 'restaurants' ? '🍽️' : '📍';
    const price = addModalItem.type === 'hotels'
      ? Number((addModalItem.raw as HotelResult).pricePerNight || 0)
      : addModalItem.type === 'restaurants'
        ? Math.max(0, ((((addModalItem.raw as RestaurantResult).priceRange || '').match(/\$/g)?.length ?? 1) * 15))
        : Math.max(0, Number((((addModalItem.raw as AttractionResult).entryFee || '').match(/\d+(?:\.\d+)?/) || ['0'])[0]));
    await itineraryService.addItem(itineraryId, {
      placeId: addModalItem.id,
      notes: `${emoji} ${addModalItem.name} (${destination})`,
      imageUrl: addModalItem.imageUrl,
      location: addModalItem.location || destination,
      price,
      currency: 'USD',
    });
  };

  const openAddModal = (
    item: HotelResult | RestaurantResult | AttractionResult,
    type: Tab
  ) => {
    if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; }
    const raw = item as any;
    setAddModalItem({
      id: raw.id || String(Math.random()),
      name: raw.name,
      type,
      imageUrl: raw.imageKeyword ? placeImg(raw.imageKeyword, 0) : undefined,
      location: raw.address || raw.location || destination,
      raw: item,
    });
  };

  const tabColors: Record<Tab, string> = {
    all: 'from-purple-600 to-indigo-600',
    hotels: 'from-purple-600 to-indigo-600',
    restaurants: 'from-rose-500 to-pink-600',
    attractions: 'from-emerald-500 to-teal-600',
    flights: 'from-sky-500 to-indigo-600',
  };

  const filteredHotels = hotels.filter((h) =>
    (resultCategoryFilter === 'all' || resultCategoryFilter === 'hotel') &&
    h.rating >= resultMinRating &&
    h.pricePerNight <= resultMaxPrice
  );

  const filteredRestaurants = restaurants.filter((r) =>
    (resultCategoryFilter === 'all' || resultCategoryFilter === 'restaurant') &&
    r.rating >= resultMinRating
  );

  const filteredAttractions = attractions.filter((a) =>
    resultCategoryFilter === 'all' || resultCategoryFilter === 'attraction'
  );

  // Paginated slices for search results
  const pagedHotels = filteredHotels.slice((hotelPage - 1) * RESULT_PAGE_SIZE, hotelPage * RESULT_PAGE_SIZE);
  const hotelTotalPages = Math.ceil(filteredHotels.length / RESULT_PAGE_SIZE);
  const pagedRestaurants = filteredRestaurants.slice((restaurantPage - 1) * RESULT_PAGE_SIZE, restaurantPage * RESULT_PAGE_SIZE);
  const restaurantTotalPages = Math.ceil(filteredRestaurants.length / RESULT_PAGE_SIZE);
  const pagedAttractions = filteredAttractions.slice((attractionPage - 1) * RESULT_PAGE_SIZE, attractionPage * RESULT_PAGE_SIZE);
  const attractionTotalPages = Math.ceil(filteredAttractions.length / RESULT_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero / Search ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 pt-32 pb-24 px-6">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
            alt="Destinations banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-purple-900/75 to-indigo-900/80" />
        </div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-400 to-transparent" />

        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-purple-300 text-sm font-semibold uppercase tracking-widest"
          >
            Smart Travel Planner
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-5xl md:text-6xl font-black text-white leading-tight"
          >
            Explore Any Destination
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="text-slate-300 text-lg"
          >
            Search hotels, restaurants, and top attractions in one place.
          </motion.p>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearch}
            className="flex gap-3 mt-2"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 120)}
                placeholder="Where do you want to go?"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
              />
              {isInputFocused && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                  {searchSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => {
                        setInputValue(s);
                        setDestination(s);
                        fetchAll(s);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 flex items-center gap-2"
                    >
                      <MapPin size={13} className="text-slate-400" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loadingTab || !inputValue.trim()}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-7 py-4 rounded-2xl font-bold text-sm transition shrink-0"
            >
              {loadingTab ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </motion.form>

          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={handleEnableNearYou}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${nearYouEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white/10 text-white border-white/25'}`}
            >
              {nearYouEnabled ? 'Near You enabled' : 'Use my location'}
            </button>
          </div>

          {/* Popular pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['Paris', 'Tokyo', 'Bali', 'New York', 'Rome', 'Singapore'].map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  setInputValue(city);
                  setDestination(city);
                  setHotels([]);
                  setRestaurants([]);
                  setAttractions([]);
                  fetchAll(city);
                }}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white text-xs font-semibold transition"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky Tabs ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 py-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                activeTab === key
                  ? 'border-purple-600 text-purple-700 bg-purple-50'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          {destination && (
            <div className="ml-auto flex items-center gap-2 py-2 pr-1">
              <MapPin size={14} className="text-purple-500" />
              <span className="text-sm font-semibold text-slate-700">{destination}</span>
              <button
                onClick={() => {
                  setDestination('');
                  setInputValue('');
                  setHotels([]);
                  setRestaurants([]);
                  setAttractions([]);
                  setHasSearched(false);
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* ══════════ BROWSE MODE (no search active) ══════════ */}
        {!hasSearched && (() => {
          const handleSelect = (name: string) => {
            setInputValue(name);
            setDestination(name);
            void fetchAll(name);
          };
          const trending = [...catalogItems].sort((a, b) => b.rating - a.rating).slice(0, 12);
          const beaches  = catalogItems.filter(d => d.category === 'Beach');
          const cities   = catalogItems.filter(d => d.category === 'City');
          const nature   = catalogItems.filter(d => d.category === 'Nature' || d.category === 'Adventure');
          const international = catalogItems.filter(d => !['Beach', 'City', 'Nature', 'Adventure'].includes(d.category));

          return (
            <div>
              {/* 1. Trending Now */}
              <DestHSection
                title="Trending Now"
                subtitle="Most popular destinations this season"
                items={trending}
                onSelect={handleSelect}
                icon={TrendingUp}
              />

              {/* 2. Beach Destinations */}
              <DestHSection
                title="Beach Destinations"
                subtitle="Sun, sand & crystal clear waters"
                items={beaches}
                onSelect={handleSelect}
                icon={Waves}
              />

              {/* 3. City Escapes */}
              <DestHSection
                title="City Escapes"
                subtitle="Urban adventures, food & culture"
                items={cities}
                onSelect={handleSelect}
                icon={Building2}
              />

              {/* 4. Nature & Adventure */}
              <DestHSection
                title="Nature & Adventure"
                subtitle="Mountains, forests & wild landscapes"
                items={nature}
                onSelect={handleSelect}
                icon={Trees}
              />

              {/* 5. International Destinations */}
              {international.length > 0 && (
                <DestHSection
                  title="International Highlights"
                  subtitle="Hidden gems from around the world"
                  items={international}
                  onSelect={handleSelect}
                  icon={Globe}
                />
              )}

              {/* 6. All Destinations (paginated) */}
              <div className="mt-4">
                <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5">
                      <Compass size={12} /> All Destinations
                    </p>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                      {urlLocation && !urlCategory && !urlTag ? (
                        <>Destinations in <span className="text-purple-600">{urlLocation}</span></>
                      ) : urlCategory && !urlTag ? (
                        <>{urlCategory} <span className="text-slate-500">Destinations</span></>
                      ) : urlTag ? (
                        <><span className="text-purple-600">{urlTag}</span> <span className="text-slate-500">Destinations</span></>
                      ) : (
                        <>Explore All <span className="text-purple-600">{catalogItems.length}</span> Places</>
                      )}
                    </h2>
                  </div>
                </div>

                {/* Search + Filter */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={destSearch}
                      onChange={(e) => { setDestSearch(e.target.value); setDestPage(1); }}
                      placeholder="Search destinations…"
                      className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {(['all', 'Beach', 'City', 'Nature', 'Adventure'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setDestCategoryFilter(cat); setDestPage(1); }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                          destCategoryFilter === cat
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {cat === 'all' ? <Filter size={13} /> : cat === 'Beach' ? <Waves size={13} /> : cat === 'City' ? <Building2 size={13} /> : cat === 'Nature' ? <Trees size={13} /> : <Compass size={13} />}
                        {cat === 'all' ? 'All' : cat}
                      </button>
                    ))}
                    {(urlLocation || urlCategory || urlTag) && (
                      <button onClick={() => { navigate('/destinations'); setDestPage(1); }} className="text-xs text-rose-500 font-semibold underline hover:text-rose-600">Clear filters</button>
                    )}
                  </div>
                </div>

                {/* Grid */}
                {destPageItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                    <Search size={40} strokeWidth={1.2} />
                    <p className="text-sm text-slate-600">No destinations found. Try a different search.</p>
                    <button onClick={() => { setDestSearch(''); setDestCategoryFilter('all'); }} className="text-xs text-purple-600 underline">Clear filters</button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {destPageItems.map((item, idx) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        onClick={() => handleSelect(item.location)}
                        className="group relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-shadow text-left"
                      >
                        <div className="h-52 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <p className="text-white font-black text-lg leading-tight">{item.name}</p>
                          <p className="text-white/80 text-sm">{item.country}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-amber-400 text-xs font-bold">★ {item.rating.toFixed(1)}</span>
                            <span className="text-white/60 text-xs">{item.description.slice(0, 50)}…</span>
                          </div>
                          <div className="flex gap-1.5 mt-3 flex-wrap">
                            {getDestinationTags(item.name, item.category).map(tag => (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/destinations?tag=${tag}`);
                                }}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        <span className={`absolute top-3 right-3 text-white text-[9px] font-bold px-2.5 py-1 rounded-full ${
                          item.category === 'Beach' ? 'bg-sky-500/90' : item.category === 'City' ? 'bg-purple-600/90' : item.category === 'Nature' ? 'bg-emerald-600/90' : 'bg-amber-600/90'
                        }`}>
                          {item.category}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {destTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setDestPage(p => Math.max(1, p - 1))}
                      disabled={destPage === 1}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                    >
                      <ChevronLeft size={15} /> Prev
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(destTotalPages, 7) }, (_, i) => {
                        let page: number;
                        if (destTotalPages <= 7) {
                          page = i + 1;
                        } else if (destPage <= 4) {
                          page = i + 1;
                        } else if (destPage >= destTotalPages - 3) {
                          page = destTotalPages - 6 + i;
                        } else {
                          page = destPage - 3 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setDestPage(page)}
                            className={`w-10 h-10 rounded-xl text-sm font-bold transition ${
                              destPage === page
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setDestPage(p => Math.min(destTotalPages, p + 1))}
                      disabled={destPage === destTotalPages}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                    >
                      Next <ChevronRight size={15} />
                    </button>
                  </div>
                )}
                <p className="text-center text-xs text-slate-400 mt-3">
                  Showing {((destPage - 1) * DEST_PAGE_SIZE) + 1}–{Math.min(destPage * DEST_PAGE_SIZE, destFiltered.length)} of {destFiltered.length} destinations
                </p>
              </div>
            </div>
          );
        })()}

        {/* Loading skeleton */}
        {loadingTab && <SkeletonGrid />}

        {/* Error */}
        {!loadingTab && errorTab && (
          <ErrorState onRetry={() => fetchAll(destination)} />
        )}

        {/* Results */}
        {!loadingTab && !errorTab && hasSearched && (
          <>
            <div className="grid md:grid-cols-3 gap-3 mb-6">
              <select
                value={resultCategoryFilter}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'hotel' | 'restaurant' | 'attraction';
                  setResultCategoryFilter(val);
                  setHotelPage(1); setRestaurantPage(1); setAttractionPage(1);
                  if (val === 'hotel') setActiveTab('hotels');
                  else if (val === 'restaurant') setActiveTab('restaurants');
                  else if (val === 'attraction') setActiveTab('attractions');
                  else setActiveTab('all');
                }}
                className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm"
              >
                <option value="all">All result categories</option>
                <option value="hotel">Hotels</option>
                <option value="restaurant">Restaurants</option>
                <option value="attraction">Places to Visit</option>
              </select>
              <select
                value={resultMinRating}
                onChange={(e) => setResultMinRating(Number(e.target.value))}
                className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm"
              >
                <option value={0}>Any rating</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
                <option value={4.8}>4.8+</option>
              </select>
              <select
                value={resultMaxPrice}
                onChange={(e) => setResultMaxPrice(Number(e.target.value))}
                className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm"
              >
                <option value={9999}>Any price</option>
                <option value={120}>Up to $120</option>
                <option value={200}>Up to $200</option>
                <option value={350}>Up to $350</option>
              </select>
            </div>

            <AnimatePresence mode="wait">
            {activeTab === 'all' && (
              <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                <div>
                  <SectionHeader count={filteredAttractions.length} label="places to visit" destination={destination} gradient={tabColors.attractions} />
                  {filteredAttractions.length === 0 ? (
                    <EmptyState message="No attractions found for this destination." icon={Landmark} />
                  ) : (
                    <>
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {pagedAttractions.map((a, i) => (
                          <AttractionCard key={a.id || i} attraction={a} index={i}
                            onAdd={(a) => openAddModal(a, 'attractions')}
                            onFlight={(a) => openFlightSearch({ destination, placeId: String(a.id || a.name), placeName: a.name })}
                            onVisit={(a) => setVisitModal(a)}
                            onView={(a) => openDetail(a, 'attractions')}
                            wishlisted={wishlistIds.has((a as any).id || (a as any).name)}
                            onToggleWishlist={(a) => void toggleWishlist(a, 'attractions')} />
                        ))}
                      </div>
                      <ResultPageNav page={attractionPage} total={attractionTotalPages}
                        onPrev={() => setAttractionPage(p => Math.max(1, p - 1))}
                        onNext={() => setAttractionPage(p => Math.min(attractionTotalPages, p + 1))} />
                    </>
                  )}
                </div>

                <div>
                  <SectionHeader count={filteredHotels.length} label="hotels" destination={destination} gradient={tabColors.hotels} />
                  {filteredHotels.length === 0 ? (
                    <EmptyState message="No hotels found for this destination." icon={Hotel} />
                  ) : (
                    <>
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {pagedHotels.map((h, i) => (
                          <HotelCard key={h.id || i} hotel={h} index={i}
                            onAdd={(h) => openAddModal(h, 'hotels')}
                            onBook={(h) => { if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; } setBookingModal(h); setBookingForm({ checkIn: '', checkOut: '', guests: 1 }); setBookingDone(false); }}
                            onFlight={(h) => openFlightSearch({ destination, placeId: String(h.id || h.name), placeName: h.name })}
                            onView={(h) => openDetail(h, 'hotels')}
                            wishlisted={wishlistIds.has((h as any).id || (h as any).name)}
                            onToggleWishlist={(h) => void toggleWishlist(h, 'hotels')} />
                        ))}
                      </div>
                      <ResultPageNav page={hotelPage} total={hotelTotalPages}
                        onPrev={() => setHotelPage(p => Math.max(1, p - 1))}
                        onNext={() => setHotelPage(p => Math.min(hotelTotalPages, p + 1))} />
                    </>
                  )}
                </div>

                <div>
                  <SectionHeader count={filteredRestaurants.length} label="restaurants" destination={destination} gradient={tabColors.restaurants} />
                  {filteredRestaurants.length === 0 ? (
                    <EmptyState message="No restaurants found for this destination." icon={UtensilsCrossed} />
                  ) : (
                    <>
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {pagedRestaurants.map((r, i) => (
                          <RestaurantCard key={r.id || i} restaurant={r} index={i}
                            onAdd={(r) => openAddModal(r, 'restaurants')}
                            onFlight={(r) => openFlightSearch({ destination, placeId: String(r.id || r.name), placeName: r.name })}
                            onReserve={(r) => { if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; } setReserveModal(r); setReserveForm({ date: '', time: '19:00', people: 2 }); setReserveDone(false); }}
                            onView={(r) => openDetail(r, 'restaurants')}
                            wishlisted={wishlistIds.has((r as any).id || (r as any).name)}
                            onToggleWishlist={(r) => void toggleWishlist(r, 'restaurants')} />
                        ))}
                      </div>
                      <ResultPageNav page={restaurantPage} total={restaurantTotalPages}
                        onPrev={() => setRestaurantPage(p => Math.max(1, p - 1))}
                        onNext={() => setRestaurantPage(p => Math.min(restaurantTotalPages, p + 1))} />
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'hotels' && (
              <motion.div key="hotels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SectionHeader count={filteredHotels.length} label="hotels" destination={destination} gradient={tabColors.hotels} />
                {filteredHotels.length === 0 ? (
                  <EmptyState message="No hotels found for this destination." icon={Hotel} />
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {pagedHotels.map((h, i) => (
                        <HotelCard key={h.id || i} hotel={h} index={i}
                          onAdd={(h) => openAddModal(h, 'hotels')}
                          onBook={(h) => { if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; } setBookingModal(h); setBookingForm({ checkIn: '', checkOut: '', guests: 1 }); setBookingDone(false); }}
                          onFlight={(h) => openFlightSearch({ destination, placeId: String(h.id || h.name), placeName: h.name })}
                          onView={(h) => openDetail(h, 'hotels')}
                          wishlisted={wishlistIds.has((h as any).id || (h as any).name)}
                          onToggleWishlist={(h) => void toggleWishlist(h, 'hotels')} />
                      ))}
                    </div>
                    <ResultPageNav page={hotelPage} total={hotelTotalPages}
                      onPrev={() => setHotelPage(p => Math.max(1, p - 1))}
                      onNext={() => setHotelPage(p => Math.min(hotelTotalPages, p + 1))} />
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'restaurants' && (
              <motion.div key="restaurants" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SectionHeader count={filteredRestaurants.length} label="restaurants" destination={destination} gradient={tabColors.restaurants} />
                {filteredRestaurants.length === 0 ? (
                  <EmptyState message="No restaurants found for this destination." icon={UtensilsCrossed} />
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {pagedRestaurants.map((r, i) => (
                        <RestaurantCard key={r.id || i} restaurant={r} index={i}
                          onAdd={(r) => openAddModal(r, 'restaurants')}
                          onFlight={(r) => openFlightSearch({ destination, placeId: String(r.id || r.name), placeName: r.name })}
                          onReserve={(r) => { if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; } setReserveModal(r); setReserveForm({ date: '', time: '19:00', people: 2 }); setReserveDone(false); }}
                          onView={(r) => openDetail(r, 'restaurants')}
                          wishlisted={wishlistIds.has((r as any).id || (r as any).name)}
                          onToggleWishlist={(r) => void toggleWishlist(r, 'restaurants')} />
                      ))}
                    </div>
                    <ResultPageNav page={restaurantPage} total={restaurantTotalPages}
                      onPrev={() => setRestaurantPage(p => Math.max(1, p - 1))}
                      onNext={() => setRestaurantPage(p => Math.min(restaurantTotalPages, p + 1))} />
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'attractions' && (
              <motion.div key="attractions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SectionHeader count={filteredAttractions.length} label="places to visit" destination={destination} gradient={tabColors.attractions} />
                {filteredAttractions.length === 0 ? (
                  <EmptyState message="No attractions found for this destination." icon={Landmark} />
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {pagedAttractions.map((a, i) => (
                        <AttractionCard key={a.id || i} attraction={a} index={i}
                          onAdd={(a) => openAddModal(a, 'attractions')}
                          onFlight={(a) => openFlightSearch({ destination, placeId: String(a.id || a.name), placeName: a.name })}
                          onVisit={(a) => setVisitModal(a)}
                          onView={(a) => openDetail(a, 'attractions')}
                          wishlisted={wishlistIds.has((a as any).id || (a as any).name)}
                          onToggleWishlist={(a) => void toggleWishlist(a, 'attractions')} />
                      ))}
                    </div>
                    <ResultPageNav page={attractionPage} total={attractionTotalPages}
                      onPrev={() => setAttractionPage(p => Math.max(1, p - 1))}
                      onNext={() => setAttractionPage(p => Math.min(attractionTotalPages, p + 1))} />
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'flights' && (
              <motion.div key="flights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Flight Search Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Flights</p>
                    <h2 className="text-2xl font-black text-slate-900">
                      Search Flights to{' '}
                      <span className="bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent">
                        {destination || 'Your Destination'}
                      </span>
                    </h2>
                  </div>
                </div>

                {/* Search Form */}
                <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-3xl p-6 md:p-8 mb-8">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Plane size={13} /> Flight Search
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sky-100 text-xs font-bold mb-1.5">From</label>
                      <input
                        type="text" value={flightFrom}
                        onChange={(e) => setFlightFrom(e.target.value)}
                        placeholder="City or airport"
                        className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/30 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-100 text-xs font-bold mb-1.5">To</label>
                      <input
                        type="text" value={destination || flightModal || ''}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white text-sm cursor-default"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-100 text-xs font-bold mb-1.5">Departure</label>
                      <input
                        type="date" value={flightDep}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFlightDep(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-100 text-xs font-bold mb-1.5">Return</label>
                      <input
                        type="date" value={flightRet}
                        min={flightDep || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFlightRet(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => { void handleFlightSearch(); }}
                    disabled={flightLoading}
                    className="mt-5 px-8 py-3.5 bg-white text-indigo-700 font-black text-sm rounded-xl hover:bg-sky-50 transition flex items-center gap-2 shadow-lg shadow-indigo-900/20 disabled:opacity-60"
                  >
                    {flightLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Search Flights
                  </button>
                </div>

                {/* Results */}
                {!flightSearched && !flightError ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <Plane size={48} strokeWidth={1.2} />
                    <p className="text-base font-medium text-slate-500">Fill in your dates and click Search Flights</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-sm font-bold text-slate-700">
                        {flightResults.length} flights found{flightFrom ? ` from ${flightFrom}` : ''}{flightDep ? ` · ${flightDep}` : ''}
                      </p>
                      <button onClick={() => { setFlightSearched(false); setFlightError(''); setFlightResults([]); }} className="text-xs font-semibold text-purple-600 hover:underline">
                        New Search
                      </button>
                    </div>
                    {flightLoading ? (
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" /> Searching flights...
                      </div>
                    ) : null}
                    {flightNotice ? (
                      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {flightNotice}
                      </div>
                    ) : null}
                    {flightError && !flightNotice ? (
                      <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {flightError}
                      </div>
                    ) : null}
                    {!flightLoading && flightResults.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                        No flights available for this route yet.
                      </div>
                    ) : null}
                    <div className="space-y-4">
                      {flightResults.map((f, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition p-4 md:p-5 flex flex-wrap md:flex-nowrap items-center gap-4"
                        >
                          {/* Airline badge */}
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex flex-col items-center justify-center text-white shrink-0 shadow">
                            <Plane size={18} />
                            <span className="text-[9px] font-black mt-0.5">{f.code}</span>
                          </div>
                          {/* Route */}
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 text-base">{f.airline}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm font-bold text-slate-800">{f.departTime}</span>
                              <div className="flex-1 flex items-center gap-1 min-w-0">
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${f.stops === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{stopLabel(f.stops)}</span>
                                <div className="h-px flex-1 bg-slate-200" />
                              </div>
                              <span className="text-sm font-bold text-slate-800">{f.arriveTime}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{flightFrom || 'Your city'} → {destination} · {f.duration}</p>
                          </div>
                          {/* Price + Book */}
                          <div className="flex flex-col items-end gap-2 ml-auto shrink-0">
                            <p className="text-2xl font-black text-indigo-600">{f.currency} {f.price}</p>
                            <p className="text-[10px] text-slate-400 -mt-1.5">per person</p>
                            <button
                              onClick={() => setSelectedFlight(f)}
                              className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-md hover:shadow-indigo-500/25 transition flex items-center gap-1.5"
                            >
                              <Plane size={11} /> Select
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {flightResults.length > 0 ? (
                      <p className="text-[10px] text-slate-400 text-center mt-6">Flight results use airport-code search and fall back to mock data when live data is unavailable.</p>
                    ) : null}
                  </>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* ── Add to trip modal ── */}
      <AnimatePresence>
        {addModalItem && (
          <AddToTripModal
            itemName={addModalItem.name}
            itemType={addModalItem.type}
            itemId={addModalItem.id}
            itineraries={itineraries}
            defaultDestination={destination}
            onClose={() => setAddModalItem(null)}
            onAdd={handleConfirmAdd}
            onTripCreated={(trip) => setItineraries(prev => [...prev, trip])}
          />
        )}
      </AnimatePresence>

      {/* ── Detail popup with map ── */}
      <AnimatePresence>
        {detailItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
          >
            <div className="min-h-full flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                className="w-full max-w-4xl rounded-[28px] overflow-hidden bg-white shadow-2xl"
              >
                <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="relative min-h-[280px] lg:min-h-full">
                    <img src={detailItem.imageUrl} alt={detailItem.name} className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      onClick={() => setDetailItem(null)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-slate-700 flex items-center justify-center shadow"
                    >
                      <X size={18} />
                    </button>
                    <span className="absolute bottom-4 left-4 bg-white/90 text-slate-800 text-[10px] font-bold px-3 py-1 rounded-full">
                      {detailItem.type === 'hotels' ? 'Hotel' : detailItem.type === 'restaurants' ? 'Restaurant' : 'Attraction'}
                    </span>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{detailItem.name}</h3>
                      <p className="flex items-center gap-1 text-sm text-slate-500 mt-1"><MapPin size={13} />{detailItem.location}</p>
                      {detailItem.rating > 0 && (
                        <p className="flex items-center gap-1 text-amber-500 font-semibold text-sm mt-1">
                          <Star size={14} fill="currentColor" /> {detailItem.rating.toFixed(1)}
                        </p>
                      )}
                    </div>
                    {detailItem.description && (
                      <p className="text-sm text-slate-600 leading-relaxed">{detailItem.description}</p>
                    )}
                    {/* Map */}
                    <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 shrink-0">
                      <iframe
                        title="map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(detailItem.name + ', ' + (detailItem.location || destination))}&output=embed&zoom=14`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-auto">
                      <button
                        onClick={() => {
                          openAddModal(detailItem.raw, detailItem.type);
                          setDetailItem(null);
                        }}
                        className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-purple-700 transition"
                      >
                        <Plus size={15} /> Add to trip
                      </button>
                      <button
                        onClick={() => {
                          void toggleWishlist(detailItem.raw, detailItem.type);
                          const id = (detailItem.raw as any).id || (detailItem.raw as any).name;
                          setWishlistIds(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border transition ${
                          wishlistIds.has((detailItem.raw as any).id || (detailItem.raw as any).name)
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Heart size={15} className={wishlistIds.has((detailItem.raw as any).id || (detailItem.raw as any).name) ? 'fill-rose-500' : ''} />
                        {wishlistIds.has((detailItem.raw as any).id || (detailItem.raw as any).name) ? 'Saved' : 'Save'}
                      </button>
                      <button
                        onClick={() => { navigate('/destinations', { state: { to: destination } }); setDetailItem(null); }}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                      >
                        <Search size={15} /> More results
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Favorites Toast ── */}
      <AnimatePresence>
        {favToast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-bold pointer-events-none ${
              favToast.added ? 'bg-gradient-to-r from-rose-500 to-pink-600' : 'bg-slate-800'
            }`}
          >
            <Heart size={16} className={favToast.added ? 'fill-white' : ''} />
            {favToast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />

      {/* ── Hotel Booking Modal ── */}
      <AnimatePresence>
        {bookingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setBookingModal(null); setBookingDone(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
              {/* Header image */}
              <div className="relative h-44 overflow-hidden">
                <img src={placeImg(bookingModal.imageKeyword, 0)} alt={bookingModal.name}
                  className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <button onClick={() => { setBookingModal(null); setBookingDone(false); setBookingSubmitting(false); setConfirmedHotelBooking(null); setHotelCancelling(false); }}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/80 rounded-full shadow text-slate-700">
                  <X size={16} />
                </button>
                <div className="absolute bottom-4 left-4">
                  <p className="text-white font-black text-xl leading-tight">{bookingModal.name}</p>
                  <p className="text-white/70 text-sm">{bookingModal.address}</p>
                </div>
              </div>
              {bookingDone ? (
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900">Booking Confirmed!</p>
                  <p className="text-sm text-slate-500">Your stay at <strong>{bookingModal.name}</strong> has been added to your trip.</p>
                  {confirmedHotelBooking?.status === 'cancelled' ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      This hotel booking has been cancelled.
                    </p>
                  ) : (
                    <button
                      onClick={() => { void handleCancelHotelBooking(); }}
                      disabled={hotelCancelling}
                      className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {hotelCancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Cancel Booking
                    </button>
                  )}
                  <button onClick={() => { setBookingModal(null); setBookingDone(false); setBookingSubmitting(false); setConfirmedHotelBooking(null); setHotelCancelling(false); }}
                    className="mt-2 px-8 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition">
                    Done
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Book Your Stay</p>
                    <p className="text-purple-600 font-bold text-sm">{bookingModal.currency} {bookingModal.pricePerNight.toLocaleString()} / night</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Check-in</label>
                      <input type="date" value={bookingForm.checkIn}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingForm(f => ({ ...f, checkIn: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Check-out</label>
                      <input type="date" value={bookingForm.checkOut}
                        min={bookingForm.checkIn || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingForm(f => ({ ...f, checkOut: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Guests</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setBookingForm(f => ({ ...f, guests: Math.max(1, f.guests - 1) }))}
                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition font-bold text-lg">−</button>
                      <span className="flex-1 text-center font-bold text-slate-900">{bookingForm.guests} {bookingForm.guests === 1 ? 'Guest' : 'Guests'}</span>
                      <button onClick={() => setBookingForm(f => ({ ...f, guests: Math.min(10, f.guests + 1) }))}
                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition font-bold text-lg">+</button>
                    </div>
                  </div>
                  {bookingForm.checkIn && bookingForm.checkOut && bookingForm.checkIn < bookingForm.checkOut && (
                    <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-sm">
                      <p className="text-purple-700 font-semibold">
                        {Math.round((new Date(bookingForm.checkOut).getTime() - new Date(bookingForm.checkIn).getTime()) / 86400000)} nights ·{' '}
                        {bookingModal.currency} {(bookingModal.pricePerNight * Math.round((new Date(bookingForm.checkOut).getTime() - new Date(bookingForm.checkIn).getTime()) / 86400000)).toLocaleString()} total
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => openAddModal(bookingModal, 'hotels')}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                      + Add to Trip
                    </button>
                    <button
                      disabled={!bookingForm.checkIn || !bookingForm.checkOut || bookingForm.checkIn >= bookingForm.checkOut}
                      onClick={async () => {
                        if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; }
                        setBookingSubmitting(true);
                        const nights = Math.max(1, Math.round(
                          (new Date(bookingForm.checkOut).getTime() - new Date(bookingForm.checkIn).getTime()) / 86400000
                        ));
                        const totalPrice = bookingModal!.pricePerNight * nights;
                        try {
                          const result = await bookingService.createWithTrip({
                            userId: user.uid,
                            itineraryId: '',
                            placeId: String((bookingModal as any).id || bookingModal!.name),
                            placeName: bookingModal!.name,
                            destination,
                            tripTitle: `Trip to ${destination}`,
                            bookingType: 'hotel',
                            hotelName: bookingModal!.name,
                            location: bookingModal!.address,
                            imageUrl: placeImg(bookingModal!.imageKeyword, 0),
                            checkIn: bookingForm.checkIn,
                            checkOut: bookingForm.checkOut,
                            guests: bookingForm.guests,
                            totalPrice,
                            currency: bookingModal!.currency,
                            status: 'confirmed',
                          });
                          setConfirmedHotelBooking(result.booking);
                          setBookingDone(true);
                        } catch {
                          setFavToast({ msg: 'Could not save booking', added: false });
                          setTimeout(() => setFavToast(null), 2500);
                        } finally {
                          setBookingSubmitting(false);
                        }
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {bookingSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Bed size={14} />} Confirm Booking
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Restaurant Reserve Modal ── */}
      <AnimatePresence>
        {reserveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setReserveModal(null); setReserveDone(false); setConfirmedRestaurantBooking(null); setRestaurantCancelling(false); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
              <div className="relative h-44 overflow-hidden">
                <img src={placeImg(reserveModal.imageKeyword, 0)} alt={reserveModal.name}
                  className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <button onClick={() => { setReserveModal(null); setReserveDone(false); setConfirmedRestaurantBooking(null); setRestaurantCancelling(false); }}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/80 rounded-full shadow text-slate-700">
                  <X size={16} />
                </button>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 inline-block">{reserveModal.cuisine}</span>
                  <p className="text-white font-black text-xl leading-tight">{reserveModal.name}</p>
                  <p className="text-white/70 text-sm">{reserveModal.address}</p>
                </div>
              </div>
              {reserveDone ? (
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900">Reservation Confirmed!</p>
                  <p className="text-sm text-slate-500">Table at <strong>{reserveModal.name}</strong> added to your trip.</p>
                  {confirmedRestaurantBooking?.status === 'cancelled' ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      This restaurant reservation has been cancelled.
                    </p>
                  ) : (
                    <button
                      onClick={() => { void handleCancelRestaurantBooking(); }}
                      disabled={restaurantCancelling}
                      className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {restaurantCancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Cancel Reservation
                    </button>
                  )}
                  <button onClick={() => { setReserveModal(null); setReserveDone(false); setConfirmedRestaurantBooking(null); setRestaurantCancelling(false); }}
                    className="mt-2 px-8 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition">
                    Done
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Make a Reservation</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date</label>
                    <input type="date" value={reserveForm.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setReserveForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Time</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['12:00', '13:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'].map(t => (
                        <button key={t} onClick={() => setReserveForm(f => ({ ...f, time: t }))}
                          className={`px-2 py-2 rounded-xl text-xs font-bold border transition ${reserveForm.time === t ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Party size</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setReserveForm(f => ({ ...f, people: Math.max(1, f.people - 1) }))}
                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition font-bold text-lg">−</button>
                      <span className="flex-1 text-center font-bold text-slate-900 flex items-center justify-center gap-1.5">
                        <Users size={14} /> {reserveForm.people} {reserveForm.people === 1 ? 'Person' : 'People'}
                      </span>
                      <button onClick={() => setReserveForm(f => ({ ...f, people: Math.min(20, f.people + 1) }))}
                        className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition font-bold text-lg">+</button>
                    </div>
                  </div>
                  {reserveForm.date && (
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700 font-medium">
                      📅 {new Date(reserveForm.date).toDateString()} at {reserveForm.time} for {reserveForm.people} {reserveForm.people === 1 ? 'person' : 'people'}
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => openAddModal(reserveModal, 'restaurants')}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                      + Add to Trip
                    </button>
                    <button
                      disabled={!reserveForm.date}
                      onClick={async () => {
                        if (user && reserveForm.date) {
                          const estimatedTotal = Math.max(0, (((reserveModal!.priceRange || '').match(/\$/g)?.length ?? 1) * 15) * reserveForm.people);
                          try {
                            const result = await bookingService.createWithTrip({
                              userId: user.uid,
                              itineraryId: '',
                              placeId: String((reserveModal as any).id || reserveModal!.name),
                              placeName: reserveModal!.name,
                              destination,
                              tripTitle: `Trip to ${destination}`,
                              bookingType: 'restaurant',
                              hotelName: reserveModal!.name,
                              location: reserveModal!.address,
                              imageUrl: placeImg(reserveModal!.imageKeyword, 0),
                              checkIn: reserveForm.date,
                              checkOut: reserveForm.date,
                              guests: reserveForm.people,
                              totalPrice: estimatedTotal,
                              currency: 'USD',
                              status: 'confirmed',
                            });
                            setConfirmedRestaurantBooking(result.booking);
                          } catch { /* non-fatal */ }
                          setReserveDone(true);
                        } else {
                          navigate('/login', { state: { from: '/destinations' } });
                        }
                      }}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-rose-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      <CalendarCheck size={14} /> Reserve Table
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Attraction Visit Modal ── */}
      <AnimatePresence>
        {visitModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setVisitModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
              <div className="relative h-56 overflow-hidden">
                <img src={placeImg(visitModal.imageKeyword, 0)} alt={visitModal.name}
                  className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <button onClick={() => setVisitModal(null)}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/80 rounded-full shadow text-slate-700">
                  <X size={16} />
                </button>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block">{visitModal.category}</span>
                  <p className="text-white font-black text-2xl leading-tight">{visitModal.name}</p>
                  <p className="text-white/70 text-sm flex items-center gap-1"><MapPin size={11} /> {visitModal.location}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {visitModal.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">{visitModal.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <DollarSign size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Entry Fee</p>
                      <p className="text-sm font-bold text-slate-800">{visitModal.entryFee || 'Free'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                    <Clock size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Duration</p>
                      <p className="text-sm font-bold text-slate-800">{visitModal.duration || '2–3 hrs'}</p>
                    </div>
                  </div>
                </div>
                {/* Map */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 h-40">
                  <iframe title="map" width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(visitModal.name + ', ' + (visitModal.location || destination))}&output=embed&zoom=15`} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const place = visitModal!;
                      if (!user) { navigate('/login', { state: { from: '/destinations' } }); return; }
                      setVisitModal(null);
                      openAddModal(place, 'attractions');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition"
                  >
                    <Plus size={15} /> Add to Trip
                  </button>
                  <button
                    onClick={() => void toggleWishlist(visitModal, 'attractions')}
                    className={`px-5 py-3 rounded-xl border font-bold text-sm transition flex items-center gap-2 ${
                      wishlistIds.has((visitModal as any).id || visitModal.name) ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}>
                    <Heart size={15} className={wishlistIds.has((visitModal as any).id || visitModal.name) ? 'fill-rose-500' : ''} />
                    {wishlistIds.has((visitModal as any).id || visitModal.name) ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Flight Search Modal ── */}
      <AnimatePresence>
        {flightModal !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setFlightModal(null); setFlightSearched(false); setFlightResults([]); setFlightError(''); }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white">
                    <Plane size={20} />
                    <p className="font-black text-lg">Find Flights</p>
                  </div>
                  <button onClick={() => { setFlightModal(null); setFlightSearched(false); setFlightResults([]); setFlightError(''); }}
                    className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white hover:bg-white/30 transition">
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sky-100 text-xs font-bold mb-1">From</label>
                    <input type="text" value={flightFrom}
                      onChange={(e) => setFlightFrom(e.target.value)}
                      placeholder="Departure city or airport code"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white placeholder-white/60 text-sm focus:outline-none focus:bg-white/30" />
                  </div>
                  <div>
                    <label className="block text-sky-100 text-xs font-bold mb-1">To</label>
                    <input type="text" value={flightModal || destination}
                      readOnly
                      className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none cursor-default" />
                  </div>
                  <div>
                    <label className="block text-sky-100 text-xs font-bold mb-1">Departure</label>
                    <input type="date" value={flightDep}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFlightDep(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-sky-100 text-xs font-bold mb-1">Return</label>
                    <input type="date" value={flightRet}
                      min={flightDep || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFlightRet(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm focus:outline-none [color-scheme:dark]" />
                  </div>
                </div>
                <button
                  onClick={() => { void handleFlightSearch(); }}
                  disabled={flightLoading}
                  className="mt-4 w-full py-3 bg-white text-indigo-700 font-black text-sm rounded-xl hover:bg-sky-50 transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {flightLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Search Flights
                </button>
              </div>
              {/* Results */}
              {(flightSearched || flightError) && (
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  {flightLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Searching flights...
                    </div>
                  ) : null}
                  {flightNotice ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {flightNotice}
                    </div>
                  ) : null}
                  {flightError && !flightNotice ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {flightError}
                    </div>
                  ) : null}
                  {flightResults.length > 0 ? (
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {flightResults.length} flights found{flightDep ? ` · ${flightDep}` : ''}
                    </p>
                  ) : null}
                  {!flightLoading && flightSearched && flightResults.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                      No flights available for this route yet.
                    </div>
                  ) : null}
                  {flightResults.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                        {f.code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{f.airline}</p>
                        <p className="text-xs text-slate-500">
                          {f.departTime} → {f.arriveTime} · {f.duration} ·{' '}
                          <span className={f.stops === 0 ? 'text-emerald-600 font-semibold' : ''}>{stopLabel(f.stops)}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-indigo-600 text-lg">{f.currency} {f.price}</p>
                        <p className="text-[10px] text-slate-400">per person</p>
                      </div>
                      <button
                        onClick={() => setSelectedFlight(f)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold hover:shadow-md hover:shadow-indigo-500/25 transition"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                  {flightResults.length > 0 ? (
                    <p className="text-[10px] text-slate-400 text-center pt-1">Flight results use airport-code search and fall back to mock data when live data is unavailable.</p>
                  ) : null}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeFlightBookingModal}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-sky-500 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-100">Booking Summary</p>
                    <h3 className="text-xl font-black mt-1">{selectedFlight.airline}</h3>
                  </div>
                  <button onClick={closeFlightBookingModal} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {flightBookingDone ? (
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-slate-900">Flight Booked</p>
                  <p className="text-sm text-slate-500">Your flight booking has been saved successfully.</p>
                  {confirmedFlightBooking?.status === 'cancelled' ? (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      This flight has been cancelled.
                    </p>
                  ) : (
                    <button
                      onClick={() => { void handleCancelFlightBooking(); }}
                      disabled={flightCancelling}
                      className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-6 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {flightCancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Cancel Flight
                    </button>
                  )}
                  <button onClick={closeFlightBookingModal} className="mt-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition">
                    Done
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-slate-900">{selectedFlight.flightNumber}</p>
                      <p className="text-lg font-black text-indigo-600">{selectedFlight.currency} {selectedFlight.price}</p>
                    </div>
                    <p className="text-sm text-slate-600">{selectedFlight.from} ({selectedFlight.fromCode}) -&gt; {selectedFlight.to} ({selectedFlight.toCode})</p>
                    <p className="text-sm text-slate-600">{selectedFlight.departTime} -&gt; {selectedFlight.arriveTime}</p>
                    <p className="text-sm text-slate-600">{selectedFlight.duration} · {stopLabel(selectedFlight.stops)}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Trip Summary</p>
                    <p className="text-sm text-slate-700 mt-1">Route: {selectedFlight.fromCode} -&gt; {selectedFlight.toCode}</p>
                    <p className="text-sm text-slate-700">Passenger: 1 traveler</p>
                    <p className="text-sm font-bold text-slate-900 mt-2">Total: {selectedFlight.currency} {selectedFlight.price}</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={closeFlightBookingModal} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                      Cancel
                    </button>
                    <button
                      onClick={() => { void handleConfirmFlightBooking(); }}
                      disabled={flightBookingSubmitting}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {flightBookingSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plane size={14} />} Confirm Booking
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}