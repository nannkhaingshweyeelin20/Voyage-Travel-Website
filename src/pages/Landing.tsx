import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Footer from '../components/Footer';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Instagram, 
  ArrowRight,
  Mail,
  Globe,
  Sparkles,
  Heart,
  Search,
  Home,
  Trees,
  Waves,
  Building2,
  Mountain,
  Tent,
  Castle,
  Sailboat,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BadgeCheck,
  X,
  Plus,
  Check,
  Map,
} from 'lucide-react';
import type { PropertyListing } from '../lib/gemini';
import { destinationService, favoritesService, itineraryService, type Destination, type Itinerary } from '../lib/services';
import { resolvePlaceImage } from '../lib/images';
import { useAuth } from '../lib/AuthContext';

type LandingPopularDestination = {
  id: string;
  name: string;
  country: string;
  image: string;
  rating: number;
  badge: string;
  category: 'Trending' | 'Beach' | 'City' | 'Nature' | 'Adventure';
};

export default function Landing() {
  const navigate = useNavigate();
const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [popularFilter, setPopularFilter] = useState<'Trending' | 'Beach' | 'City' | 'Nature' | 'Adventure'>('Trending');
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<LandingPopularDestination[]>([]);
  const [popularDestinationsTitle, setPopularDestinationsTitle] = useState('Destinations from Database');
  const [nearYouEnabled, setNearYouEnabled] = useState(false);
  const [nearYouLabel, setNearYouLabel] = useState('Near You');
  const [loadingListings, setLoadingListings] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [isSurprising, setIsSurprising] = useState(false);
  const [selectedListing, setSelectedListing] = useState<(PropertyListing & { imageUrl: string; listingId: string; imageIndex: number }) | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [tripSaving, setTripSaving] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripAdding, setTripAdding] = useState<string | null>(null);
  const [tripAdded, setTripAdded] = useState<string | null>(null);
  // Create-trip inline form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', destination: '', startDate: '', endDate: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  // Selected trip before confirming
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  // Success toast
  const [successMsg, setSuccessMsg] = useState('');

  // Map Landing categories to DESTINATION_CATALOG categories
  const DEST_CATEGORY_MAP: Record<string, 'Beach' | 'City' | 'Nature' | 'Adventure'> = {
    'Beachfront': 'Beach',
    'Countryside': 'Nature',
    'City': 'City',
    'Mountains': 'Nature',
    'Camping': 'Adventure',
    'Castles': 'City',
    'Boats': 'Beach',
  };

  // Map popular destination categories to tags
  const TAG_MAP: Record<string, 'Beach' | 'Countryside' | 'City' | 'Adventure'> = {
    'Beach': 'Beach',
    'City': 'City',
    'Nature': 'Countryside',
    'Adventure': 'Adventure',
    'Trending': 'Beach',
  };

  const categories = [
    { label: 'All', icon: Home },
    { label: 'Beachfront', icon: Waves },
    { label: 'Countryside', icon: Trees },
    { label: 'City', icon: Building2 },
    { label: 'Mountains', icon: Mountain },
    { label: 'Camping', icon: Tent },
    { label: 'Castles', icon: Castle },
    { label: 'Boats', icon: Sailboat },
  ];

  function categoryFromDestination(destination: Destination): LandingPopularDestination['category'] {
    const lower = `${destination.name} ${destination.description} ${destination.location}`.toLowerCase();
    if (lower.includes('beach') || lower.includes('island') || lower.includes('coast') || lower.includes('sea')) return 'Beach';
    if (lower.includes('mountain') || lower.includes('forest') || lower.includes('park') || lower.includes('jungle')) return 'Nature';
    if (lower.includes('adventure') || lower.includes('trek') || lower.includes('hike') || lower.includes('cliff')) return 'Adventure';
    if (lower.includes('city') || lower.includes('urban') || lower.includes('tokyo') || lower.includes('rome')) return 'City';
    return 'Trending';
  }

  function parseNightlyPrice(priceRange?: string, fallback = 180) {
    const match = priceRange?.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : fallback;
  }

  function splitLocation(location?: string) {
    const [city = '', country = ''] = (location || '').split(',').map((part) => part.trim());
    return {
      city: city || location || 'Destination',
      country: country || city || 'Destination',
    };
  }

  function mapDestinationToPopular(destination: Destination, index: number): LandingPopularDestination {
    return {
      id: destination.id,
      name: destination.name,
      country: destination.location || 'Travel destination',
      image: resolvePlaceImage({
        name: destination.name,
        location: destination.location,
        type: destination.type,
        imageUrl: destination.imageUrl,
      }, index),
      rating: Math.max(4.3, Math.min(5, destination.rating || 4.7)),
      badge: destination.type === 'attraction' ? 'Must Visit' : destination.type === 'hotel' ? 'Top Stay' : 'Food Pick',
      category: categoryFromDestination(destination),
    };
  }

  function mapDestinationToListing(destination: Destination, index: number): PropertyListing {
    const location = splitLocation(destination.location);
    return {
      id: destination.id,
      title: destination.name,
      city: location.city,
      country: location.country,
      propertyType: destination.type === 'hotel' ? 'Hotel' : 'Stay',
      pricePerNight: parseNightlyPrice(destination.priceRange, 140 + (index % 5) * 25),
      currency: 'USD',
      rating: Math.max(4.2, Math.min(5, destination.rating || 4.6)),
      reviewCount: 80 + index * 17,
      isGuestFavourite: (destination.rating || 0) >= 4.7,
      imageKeyword: destination.imageUrl || `${destination.name} ${destination.location}`,
      beds: 1 + (index % 3),
      baths: 1 + (index % 2),
    };
  }

  const quickDestinations = popularDestinations.slice(0, 6);

  function getPropertyImage(listing: PropertyListing, index: number): string {
    return resolvePlaceImage({
      name: listing.title,
      location: `${listing.city} ${listing.country}`,
      type: listing.propertyType,
      imageKeyword: listing.imageKeyword,
    }, index);
  }

  useEffect(() => {
    favoritesService.getAll().then((items) => {
      setWishlistIds(new Set(items.map((item) => item.id)));
    }).catch(() => setWishlistIds(new Set()));
  }, []);

  useEffect(() => {
    if (!profile?.uid) {
      setItineraries([]);
      return;
    }
    itineraryService.getByUser(profile.uid).then(setItineraries).catch(() => setItineraries([]));
  }, [profile?.uid]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingListings(true);
      try {
        const latest = await destinationService.getLatest({ type: 'hotel', limit: 24 });
        const hotels = latest
          .filter((destination: Destination) => destination.type === 'hotel')
          .map((destination: Destination, index: number) => mapDestinationToListing(destination, index));
        if (active) setListings(hotels);
      } catch {
        if (active) setListings([]);
      } finally {
        if (active) setLoadingListings(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadPopular = async () => {
      try {
        const latest = await destinationService.getLatest({ limit: 12 });
        const mapped = latest.slice(0, 12).map((destination: Destination, index: number) => mapDestinationToPopular(destination, index));
        if (alive) {
          setPopularDestinationsTitle('Destinations from Database');
          setPopularDestinations(mapped);
        }
      } catch {
        if (alive) {
          setPopularDestinationsTitle('Destinations from Database');
          setPopularDestinations([]);
        }
      }
    };
    loadPopular();
    return () => { alive = false; };
  }, []);

  const handleEnableNearYou = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        setNearYouEnabled(true);
        setNearYouLabel('Near You');
      },
      () => {
        setNearYouEnabled(false);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  const toggleWishlist = async (listing: PropertyListing, index: number) => {
    const id = listing.id || String(index);
    if (wishlistIds.has(id)) {
      await favoritesService.remove(id);
    } else {
      await favoritesService.save({
        id,
        title: listing.title,
        city: listing.city,
        country: listing.country,
        imageUrl: getPropertyImage(listing, index),
        price: listing.pricePerNight,
        currency: listing.currency,
        rating: listing.rating,
        propertyType: listing.propertyType,
      });
    }
    const next = await favoritesService.getAll();
    setWishlistIds(new Set(next.map((item) => item.id)));
  };

  const openListingDetails = (listing: PropertyListing, index: number) => {
    setSelectedListing({
      ...listing,
      imageUrl: getPropertyImage(listing, index),
      listingId: listing.id || String(index),
      imageIndex: index,
    });
  };

  const addSelectedToTrip = async (tripId: string) => {
    if (!selectedListing) return;
    setTripAdding(tripId);
    try {
      await itineraryService.addItem(tripId, {
        placeId: selectedListing.listingId,
        notes: `${selectedListing.title} · ${selectedListing.city}, ${selectedListing.country}`,
        time: '14:00',
        price: selectedListing.pricePerNight,
        currency: selectedListing.currency,
      });
      setTripAdded(tripId);
      setSuccessMsg(`Added "${selectedListing.title}" to your trip successfully!`);
      setTimeout(() => {
        setShowTripModal(false);
        setTripAdded(null);
        setPendingTripId(null);
        setShowCreateForm(false);
        setCreateForm({ title: '', destination: '', startDate: '', endDate: '' });
        setTimeout(() => setSuccessMsg(''), 3500);
      }, 900);
    } finally {
      setTripAdding(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
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
        const newTrip = { ...createForm, id: newId, userId: user.uid, days: [], status: 'draft', createdAt: new Date() } as any;
        setItineraries(prev => [...prev, newTrip]);
        setShowCreateForm(false);
        setCreateForm({ title: '', destination: '', startDate: '', endDate: '' });
        await addSelectedToTrip(newId);
      }
    } catch {
      setCreateError('Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const scrollCategories = (dir: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  const handleSurpriseMe = async () => {
    setIsSurprising(true);
    try {
      const pool = popularDestinations.length > 0 ? popularDestinations : await destinationService.getLatest({ limit: 12 });
      if (pool.length > 0) {
        const randomRec = pool[Math.floor(Math.random() * pool.length)];
        navigate('/destinations', { state: { to: 'name' in randomRec ? randomRec.name : '' } });
      }
    } catch { /* ignore */ }
    finally { setIsSurprising(false); }
  };

  const handleSubscribe = () => {
    if (!email) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  // Infer the Airbnb-style category from a listing's propertyType + city
  function inferListingCategory(listing: PropertyListing): string {
    const pt = (listing.propertyType || '').toLowerCase().trim();
    const city = (listing.city || '').toLowerCase();
    if (['houseboat', 'boat', 'yacht'].some(k => pt.includes(k))) return 'Boats';
    if (pt === 'castle' || pt === 'manor') return 'Castles';
    if (['glamping', 'camp', 'tent', 'igloo', 'treehouse'].includes(pt)) return 'Camping';
    if (['chalet', 'lodge', 'cabin'].includes(pt) &&
        !['bali', 'phuket', 'koh', 'maldives', 'goa', 'miami', 'tulum'].some(k => city.includes(k))) return 'Mountains';
    if (['farmhouse', 'estate', 'retreat', 'hacienda', 'riad', 'haveli'].some(k => pt.includes(k))) return 'Countryside';
    if (['villa', 'bungalow', 'cottage', 'home', 'cabin', 'lodge'].includes(pt) &&
        ['bali', 'phuket', 'maldives', 'santorini', 'boracay', 'goa', 'miami', 'maui', 'tulum',
         'koh', 'palawan', 'amalfi', 'positano', 'dubrovnik', 'langkawi', 'mykonos', 'zanzibar',
         'ibiza', 'bondi', 'nha trang', 'phu quoc'].some(k => city.includes(k))) return 'Beachfront';
    return 'City';
  }

  const filteredListings = (() => {
    let base = listings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.country.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'All') {
      base = base.filter(l => inferListingCategory(l) === activeCategory);
    }
    return base;
  })();

  const listingDetailFacts = useMemo(() => {
    if (!selectedListing) return [];
    return [
      `${selectedListing.propertyType} stay`,
      `${selectedListing.beds} bed${selectedListing.beds !== 1 ? 's' : ''}`,
      `${selectedListing.baths} bath${selectedListing.baths !== 1 ? 's' : ''}`,
      `${selectedListing.reviewCount || 0} reviews`,
    ];
  }, [selectedListing]);

  const suggestedPlaces = [
    ...new Set([
      ...popularDestinations.map(p => `${p.name}, ${p.country}`),
      ...listings.map(l => `${l.city}, ${l.country}`),
    ])
  ]
    .filter(item => !searchQuery || item.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 7);

  const filteredPopularDestinations = popularDestinations.filter((p) =>
    popularFilter === 'Trending' ? true : p.category === popularFilter
  );

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">

      {/* ── HERO / SEARCH BAR ── */}
      <section className="relative overflow-hidden min-h-[620px] flex items-center">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
            alt="Travel background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-28 md:py-32 text-center w-full">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-4"
          >
            Smart Travel Planner
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 tracking-tight leading-[1.05]"
          >
            Find your next<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-rose-400">adventure</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-white/75 text-base md:text-lg mb-8 md:mb-10 max-w-xl mx-auto"
          >
            Discover hotels, restaurants, and top attractions across the globe — all in one place.
          </motion.p>

          {/* Large Airbnb-style search card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-[0_16px_60px_rgba(0,0,0,0.4)] border border-gray-100 w-full max-w-4xl mx-auto overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr_0.6fr_auto] items-stretch divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* Destination input */}
              <div className="flex-1 flex items-center gap-3 px-5 py-4 relative">
                <MapPin size={18} className="text-purple-500 shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Destination</p>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                    placeholder="Where are you going?"
                    className="w-full bg-transparent border-none p-0 focus:outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-300"
                    onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) navigate('/destinations', { state: { to: searchQuery.trim() } }); }}
                  />
                </div>
                {isSearchFocused && suggestedPlaces.length > 0 && (
                  <div className="absolute left-4 right-4 top-[92%] z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    {suggestedPlaces.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={() => {
                          const target = s.split(',')[0].trim();
                          setSearchQuery(target);
                          navigate('/destinations', { state: { to: target } });
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
              {/* Check-in */}
              <div className="flex items-center gap-3 px-5 py-4 min-h-[88px]">
                <Calendar size={18} className="text-purple-500 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Check-in</p>
                  <input
                    type="date"
                    className="bg-transparent border-none p-0 focus:outline-none text-sm font-semibold text-gray-600 w-full"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              {/* Guests */}
              <div className="flex items-center gap-3 px-5 py-4 min-h-[88px]">
                <Users size={18} className="text-purple-500 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Guests</p>
                  <select className="bg-transparent border-none p-0 focus:outline-none text-sm font-semibold text-gray-600 cursor-pointer">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              {/* Search button */}
              <div className="flex items-center gap-2 p-3 md:justify-center">
                <button
                  onClick={() => { if (searchQuery.trim()) navigate('/destinations', { state: { to: searchQuery.trim() } }); else navigate('/destinations'); }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shrink-0"
                >
                  <Search size={16} />
                  Search
                </button>
                <button
                  onClick={handleSurpriseMe}
                  disabled={isSurprising}
                  title="Surprise me"
                  className="bg-amber-400 hover:bg-amber-500 text-white p-3 rounded-xl text-sm font-bold transition-colors shrink-0"
                >
                  {isSurprising ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick actions row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex flex-wrap justify-center gap-2 mt-5"
          >
            {quickDestinations.map(({ name }) => (
              <button
                key={name}
                onClick={() => navigate('/destinations', { state: { to: name } })}
                className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-sm transition"
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => navigate('/destinations')}
              className="px-4 py-1.5 rounded-full bg-rose-500/80 hover:bg-rose-500 border border-rose-400/50 text-white text-xs font-bold backdrop-blur-sm transition flex items-center gap-1"
            >
              ✈ Search Flights
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── POPULAR DESTINATIONS ── */}
      <section className="py-12 px-6 md:px-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Destinations</p>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">{popularDestinationsTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnableNearYou}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${nearYouEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {nearYouEnabled ? nearYouLabel : 'Enable Near You'}
              </button>
              <button onClick={() => navigate('/destinations')} className="text-sm text-purple-600 font-semibold hover:underline">
                View all →
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
            {(['Trending', 'Beach', 'City', 'Nature', 'Adventure'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPopularFilter(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  popularFilter === tab ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2 min-w-max">
              {(filteredPopularDestinations.length ? filteredPopularDestinations : popularDestinations).map((place, index) => (
                <button
                  key={place.id}
                  onClick={() => navigate(`/destinations?location=${encodeURIComponent(place.name)}`)}
                  className="group relative w-[250px] rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="h-40 overflow-hidden">
                    <img
                      src={place.image}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="absolute top-3 left-3 bg-white/90 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                    {place.badge}
                  </div>
                  <div className="p-4 text-left">
                    <p className="font-black text-slate-900">{place.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{place.country}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-2">★ {place.rating.toFixed(1)} popularity</p>
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const tag = TAG_MAP[place.category] || place.category;
                          navigate(`/destinations?tag=${tag}`);
                        }}
                        className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                      >
                        {place.category}
                      </button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY FILTER TABS ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center gap-2 py-1">
          <button onClick={() => scrollCategories('left')} className="p-1.5 rounded-full hover:bg-gray-100 transition shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div ref={categoryScrollRef} className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 py-2">
            {categories.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  if (label === 'All') {
                    navigate('/destinations');
                  } else {
                    const mappedCategory = DEST_CATEGORY_MAP[label] || label;
                    navigate(`/destinations?category=${mappedCategory}`);
                  }
                }}
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all border-b-2 ${
                  activeCategory === label
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => scrollCategories('right')} className="p-1.5 rounded-full hover:bg-gray-100 transition shrink-0">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── LISTINGS GRID (Airbnb-style) ── */}
      <section className="py-8 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          {(cityFilter || categoryQuery) && (
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {cityFilter ? `Stays in ${cityFilter}` : activeCategory !== 'All' ? `${activeCategory} stays` : 'Search results'}
              </h2>
              <button onClick={() => { setCityFilter(null); setCategoryQuery(null); setActiveCategory('All'); }} className="text-xs text-rose-500 underline">Clear filter</button>
            </div>
          )}

          {loadingListings && filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-400">
              <Loader2 size={36} className="animate-spin text-rose-400" />
              <p className="text-sm">Finding great places to stay…</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-gray-400">
              <Home size={40} />
              <p className="text-sm">No listings found for this category.</p>
              <button onClick={() => setActiveCategory('All')} className="text-xs text-rose-500 underline">Show all</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredListings.map((listing, i) => (
                  <motion.div
                    key={listing.id || i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group cursor-pointer"
                    onClick={() => openListingDetails(listing, i)}
                  >
                    {/* Image */}
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-3 bg-gray-100">
                      <img
                        src={getPropertyImage(listing, i)}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {/* Wishlist heart */}
                      <button
                        onClick={e => { e.stopPropagation(); void toggleWishlist(listing, i); }}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:scale-110 transition-transform shadow"
                      >
                        <Heart
                          size={16}
                          className={wishlistIds.has(listing.id || String(i)) ? 'fill-rose-500 text-rose-500' : 'text-gray-500'}
                        />
                      </button>
                      {/* Guest favourite badge */}
                      {listing.isGuestFavourite && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 text-[11px] font-semibold text-gray-800 shadow">
                          <BadgeCheck size={12} className="text-rose-500" />
                          Guest favourite
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-0.5 px-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm leading-tight truncate flex-1">
                          {listing.propertyType} in {listing.city}
                        </p>
                        {listing.rating > 0 && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-gray-900 shrink-0">
                            <Star size={12} fill="currentColor" />
                            {listing.rating.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{listing.title}</p>
                      <p className="text-xs text-gray-400">{listing.beds} bed{listing.beds !== 1 ? 's' : ''} · {listing.baths} bath{listing.baths !== 1 ? 's' : ''}</p>
                      <p className="text-sm text-gray-900 pt-1">
                        <span className="font-bold">{listing.currency} {listing.pricePerNight.toLocaleString()}</span>
                        <span className="font-normal text-gray-500"> night</span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loadingListings && filteredListings.length > 0 && (
            <div className="flex justify-center mt-12">
              <button
                onClick={() => navigate('/destinations', { state: { to: cityFilter || searchQuery || '' } })}
                className="px-8 py-3.5 border border-gray-800 text-gray-800 rounded-full text-sm font-semibold hover:bg-gray-900 hover:text-white transition-colors"
              >
                Explore hotels, restaurants &amp; attractions
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── SUBSCRIBE BANNER ── */}
      <section className="py-16 px-6 md:px-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Get inspired for your next adventure</h2>
          <p className="text-gray-500 mb-8">Subscribe for travel deals, tips, and destination ideas — no spam, ever.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <div className="relative w-full sm:max-w-md">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-11 pr-4 py-3.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <button
              onClick={handleSubscribe}
              className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3.5 rounded-full text-sm font-semibold transition-colors shadow-md"
            >
              Subscribe
            </button>
          </div>
          {subscribed && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-rose-500 font-medium"
            >
              You're subscribed! Get ready to explore 🌍
            </motion.p>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 md:px-10 border-t border-gray-100 text-sm text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Voyage Planner. All rights reserved.</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link to="/destinations" className="hover:text-gray-900 transition-colors">Trip Planner</Link>
            <Link to="/blogs" className="hover:text-gray-900 transition-colors">Blogs</Link>
            <Link to="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {selectedListing && (
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
                    <img src={selectedListing.imageUrl} alt={selectedListing.title} className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      onClick={() => setSelectedListing(null)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-slate-700 flex items-center justify-center shadow"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-6 md:p-8">
                    <p className="text-xs font-black uppercase tracking-widest text-purple-500">Featured Stay</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-2">{selectedListing.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-3">
                      <span>{selectedListing.city}, {selectedListing.country}</span>
                      <span className="inline-flex items-center gap-1 text-amber-500 font-semibold"><Star size={14} fill="currentColor" /> {selectedListing.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5">
                      {listingDetailFacts.map((fact) => (
                        <span key={fact} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{fact}</span>
                      ))}
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-600">
                      A polished base for your next trip, with strong guest ratings, convenient access to local attractions, and enough room to turn this into a full itinerary.
                    </p>
                    <div className="mt-5 rounded-2xl overflow-hidden border border-slate-200 h-44">
                      <iframe
                        title="map"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${selectedListing.city}, ${selectedListing.country}`)}&output=embed&zoom=12`}
                      />
                    </div>
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Rate</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{selectedListing.currency} {selectedListing.pricePerNight.toLocaleString()}<span className="text-sm font-semibold text-slate-400"> / night</span></p>
                      </div>
                      <button
                        onClick={() => { void toggleWishlist(selectedListing, selectedListing.imageIndex); }}
                        className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${wishlistIds.has(selectedListing.listingId) ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-700 border border-slate-200'}`}
                      >
                        {wishlistIds.has(selectedListing.listingId) ? 'Saved' : 'Save'}
                      </button>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate('/destinations', { state: { to: selectedListing.city } })}
                        className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white hover:bg-purple-700 transition"
                      >
                        Explore destination
                      </button>
                      <button
                        onClick={() => {
                          if (!profile) { navigate('/login'); return; }
                          setTripAdded(null);
                          setPendingTripId(null);
                          setShowCreateForm(false);
                          setCreateError('');
                          setCreateForm({ title: '', destination: '', startDate: '', endDate: '' });
                          setShowTripModal(true);
                        }}
                        disabled={tripSaving}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        {tripSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add to trip
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success toast ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 bg-emerald-600 text-white text-sm font-semibold px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-900/30"
          >
            <Check size={16} className="shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trip selector modal ── */}
      <AnimatePresence>
        {showTripModal && selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowTripModal(false); setShowCreateForm(false); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="px-7 pt-7 pb-5 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-1">
                      {showCreateForm ? 'New Trip' : 'Add to Trip'}
                    </p>
                    <h3 className="text-xl font-black text-slate-900">
                      {showCreateForm ? 'Plan your adventure' : 'Choose a trip'}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setShowTripModal(false); setShowCreateForm(false); setCreateError(''); }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition mt-0.5"
                  >
                    <X size={20} />
                  </button>
                </div>
                {!showCreateForm && (
                  <div className="mt-3 flex items-center gap-2.5 bg-purple-50 rounded-2xl px-3.5 py-2.5">
                    <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
                      <img src={selectedListing.imageUrl} alt={selectedListing.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{selectedListing.title}</p>
                      <p className="text-[10px] text-slate-500">{selectedListing.city}, {selectedListing.country}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal body */}
              <div className="px-7 py-5">
                <AnimatePresence mode="wait">
                  {showCreateForm ? (
                    <motion.form
                      key="create"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.18 }}
                      onSubmit={handleCreateAndAdd}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Trip Name *</label>
                        <input
                          type="text" required
                          value={createForm.title}
                          onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="e.g. Summer in Bali"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-400 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Destination *</label>
                        <input
                          type="text" required
                          value={createForm.destination}
                          onChange={e => setCreateForm(f => ({ ...f, destination: e.target.value }))}
                          placeholder={`${selectedListing.city}, ${selectedListing.country}`}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-400 transition"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Start Date *</label>
                          <input
                            type="date" required
                            value={createForm.startDate}
                            onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-400 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">End Date *</label>
                          <input
                            type="date" required
                            value={createForm.endDate}
                            onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-400 transition"
                          />
                        </div>
                      </div>
                      {createError && (
                        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{createError}</p>
                      )}
                      <p className="text-[11px] text-slate-400 pt-1">
                        <span className="font-semibold text-slate-600">{selectedListing.title}</span> will be added automatically.
                      </p>
                      <div className="flex gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => { setShowCreateForm(false); setCreateError(''); }}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-sm transition"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={creating}
                          className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm disabled:opacity-60 shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2"
                        >
                          {creating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                          {creating ? 'Creating…' : 'Create & Add'}
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="select"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.18 }}
                    >
                      {/* Trip list */}
                      {itineraries.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Map size={22} className="text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 font-medium">No trips yet</p>
                          <p className="text-xs text-slate-400 mt-1">Create one below to get started</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 mb-4 scrollbar-hide">
                          {itineraries.map((it) => (
                            <button
                              key={it.id}
                              onClick={() => setPendingTripId(prev => prev === it.id ? null : it.id)}
                              disabled={!!tripAdding}
                              className={`w-full p-3.5 text-left rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                                tripAdded === it.id
                                  ? 'border-emerald-400 bg-emerald-50'
                                  : pendingTripId === it.id
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  pendingTripId === it.id ? 'bg-purple-100' : 'bg-slate-100'
                                }`}>
                                  <Map size={14} className={pendingTripId === it.id ? 'text-purple-600' : 'text-slate-500'} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`font-semibold text-sm truncate ${pendingTripId === it.id ? 'text-purple-900' : 'text-slate-900'}`}>{it.title}</p>
                                  {it.destination && <p className="text-xs text-slate-400 mt-0.5 truncate">{it.destination}</p>}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                tripAdded === it.id
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : pendingTripId === it.id
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-slate-300'
                              }`}>
                                {(tripAdded === it.id || pendingTripId === it.id) && <Check size={11} className="text-white" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Create new trip button */}
                      <button
                        onClick={() => { setShowCreateForm(true); setCreateError(''); setCreateForm(f => ({ ...f, destination: selectedListing.city + ', ' + selectedListing.country })); }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50 text-sm font-semibold transition mb-4"
                      >
                        <Plus size={16} /> Create New Trip
                      </button>

                      {/* Confirm add button */}
                      <button
                        onClick={() => pendingTripId && void addSelectedToTrip(pendingTripId)}
                        disabled={!pendingTripId || !!tripAdding}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm disabled:opacity-40 shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2"
                      >
                        {tripAdding ? (
                          <><Loader2 size={15} className="animate-spin" /> Adding…</>
                        ) : (
                          <><Check size={15} /> Add to Trip</>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

