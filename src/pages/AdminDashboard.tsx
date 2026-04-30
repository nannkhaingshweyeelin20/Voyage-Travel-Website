import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { bookingService, Booking, destinationService, Destination, getDynamicImage, userService, UserProfile, itineraryService, Itinerary, messageService, ContactMessage } from '../lib/services';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, CheckCircle, Clock, MapPin, ShieldCheck, Users, XCircle,
  TrendingUp, Globe, Plane, AlertCircle, Search, LayoutGrid, RefreshCw,
  MessageSquare, ChevronDown, ChevronUp, Trash2, Eye, Filter, ChevronLeft, ChevronRight,
  Plus, Edit2, Star, X, Award
} from 'lucide-react';
import { handleImageError, resolvePlaceImage } from '../lib/images';

/* ── helpers ── */
import { travelImg } from '../lib/utils';
const DEST_IMGS: Record<string, string> = {
  paris:     'https://images.unsplash.com/photo-1431274172761-fcdab704a698?auto=format&fit=crop&w=600&q=80',
  tokyo:     'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80',
  bali:      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625232717-121ed31e22e7?auto=format&fit=crop&w=600&q=80',
  london:    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
};
function destImg(dest: string) {
  const key = (dest || '').toLowerCase();
  const match = Object.entries(DEST_IMGS).find(([k]) => key.includes(k));
  return match ? match[1] : resolvePlaceImage({ name: dest, type: 'city', category: 'city' }, 0);
}

/* ── Pagination helper component ── */
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

type DashTab = 'overview' | 'users' | 'bookings' | 'trips' | 'destinations' | 'messages';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataWarning, setDataWarning] = useState('');
  const [search, setSearch] = useState('');
  // trips tab state
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [tripUserFilter, setTripUserFilter] = useState('');
  const [tripDestFilter, setTripDestFilter] = useState('');
  // Pagination for trips tab
  const [tripsPage, setTripsPage] = useState(1);
  const TRIPS_PER_PAGE = 6;

  // destinations tab state
  const [destSort, setDestSort] = useState<'rating' | 'name'>('rating');
  const [destAddOpen, setDestAddOpen] = useState(false);
  const [destEditItem, setDestEditItem] = useState<Destination | null>(null);
  const [destForm, setDestForm] = useState<Omit<Destination, 'id'>>({
    name: '', type: 'attraction', description: '', location: '', imageUrl: '', priceRange: '', rating: 4.5,
  });
  const [destSaving, setDestSaving] = useState(false);
  const [destImageFile, setDestImageFile] = useState<File | null>(null);
  const [destImagePreview, setDestImagePreview] = useState('');
  const [destImageError, setDestImageError] = useState('');

  const loadMessages = async () => {
    const nextMessages = await messageService.getAll();
    setMessages(nextMessages);
    return nextMessages;
  };

  const loadData = async () => {
    setLoading(true);
    const [usersR, destsR, bookingsR, tripsR] = await Promise.allSettled([
      userService.getAllUsers(),
      destinationService.getAll(),
      bookingService.getAll(),
      itineraryService.getAllItineraries(),
    ]);
    if (usersR.status === 'fulfilled') setUsers(usersR.value); else setUsers([]);
    if (destsR.status === 'fulfilled') setDestinations(destsR.value); else setDestinations([]);
    if (bookingsR.status === 'fulfilled') setBookings(bookingsR.value); else setBookings([]);
    if (tripsR.status === 'fulfilled') setTrips(tripsR.value); else setTrips([]);
    await loadMessages();
    const bad = [usersR, destsR, bookingsR, tripsR].filter(r => r.status === 'rejected');
    if (bad.length) setDataWarning(`Could not load some data. Using available results.`);
    setLoading(false);
  };

  useEffect(() => { loadData().catch(console.error); }, []);

  // Re-sync whenever localStorage is written (from other tabs) or on a short poll
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('voyage_db_')) loadData().catch(console.error);
    };
    window.addEventListener('storage', onStorage);
    // Poll every 8s for same-tab writes (localStorage events don't fire in the same tab)
    const timer = setInterval(() => {
      loadMessages().catch(() => {});
      itineraryService.getAllItineraries().then(data => setTrips(data)).catch(() => {});
    }, 8000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
    };
  }, []);

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Delete this user permanently?')) return;
    await userService.deleteUser(uid);
    setUsers(u => u.filter(x => x.uid !== uid));
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Delete this trip?')) return;
    await itineraryService.delete(id);
    setTrips(t => t.filter(x => x.id !== id));
    if (expandedTripId === id) setExpandedTripId(null);
  };

  /* ── Destination CRUD ── */
  const openDestAdd = () => {
    setDestForm({ name: '', type: 'attraction', description: '', location: '', imageUrl: '', priceRange: '', rating: 4.5 });
    setDestEditItem(null);
    setDestImageFile(null);
    setDestImagePreview('');
    setDestImageError('');
    setDestAddOpen(true);
  };
  const openDestEdit = (dest: Destination) => {
    setDestForm({ name: dest.name, type: dest.type, description: dest.description, location: dest.location, imageUrl: dest.imageUrl, priceRange: dest.priceRange, rating: dest.rating });
    setDestEditItem(dest);
    setDestImageFile(null);
    setDestImagePreview(dest.imageUrl || '');
    setDestImageError('');
    setDestAddOpen(true);
  };
  const handleSaveDest = async (e: React.FormEvent) => {
    e.preventDefault();
    setDestSaving(true);
    try {
      let nextImageUrl = destForm.imageUrl;
      if (destImageFile) {
        nextImageUrl = await destinationService.uploadImage(destImageFile);
      }

      const nextDestForm = { ...destForm, imageUrl: nextImageUrl };

      if (destEditItem) {
        await destinationService.update(destEditItem.id, nextDestForm);
        setDestinations(ds => ds.map(d => d.id === destEditItem.id ? { ...d, ...nextDestForm } : d));
      } else {
        const result = await destinationService.create(nextDestForm);
        if (result && (result as any).id) {
          setDestinations(ds => [...ds, { id: (result as any).id, ...nextDestForm }]);
        }
      }
      setDestAddOpen(false);
    } catch (err) { console.error(err); }
    finally { setDestSaving(false); }
  };

  const revokeDestinationPreviewUrl = (value: string) => {
    if (value.startsWith('blob:')) {
      URL.revokeObjectURL(value);
    }
  };

  const handleDestinationImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setDestImageError('');

    if (!file) {
      setDestImageFile(null);
      revokeDestinationPreviewUrl(destImagePreview);
      setDestImagePreview(destEditItem?.imageUrl || '');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setDestImageFile(null);
      setDestImageError('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDestImageFile(null);
      setDestImageError('Image must be 5MB or smaller.');
      return;
    }

    revokeDestinationPreviewUrl(destImagePreview);
    setDestImageFile(file);
    setDestImagePreview(URL.createObjectURL(file));
  };
  const handleDeleteDest = async (id: string) => {
    if (!confirm('Delete this destination permanently?')) return;
    await destinationService.delete(id);
    setDestinations(ds => ds.filter(d => d.id !== id));
  };

  const handleMessageStatus = async (id: string, status: ContactMessage['status']) => {
    await messageService.updateStatus(id, status);
    await loadMessages();
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await messageService.delete(id);
    await loadMessages();
  };

  const handleUpdateBooking = async (id: string, status: Booking['status']) => {
    await bookingService.updateStatus(id, status);
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
  };

  const openDestinationResults = (destinationName: string) => {
    navigate(`/destinations?location=${encodeURIComponent(destinationName)}`);
  };

  const currentAdmin = profile?.email
    ? users.find(u => u.email.toLowerCase() === profile.email.toLowerCase()) ?? profile
    : profile;

  const isNewMessage = (status: ContactMessage['status']) => status !== 'replied';

  /* ── Stats ── */
  const kpis = [
    { label: 'Total users',   value: users.length, icon: Users, color: 'bg-[#ea5b5b] text-white', trend: '+12%' },
    { label: 'Destinations',  value: destinations.length, icon: Globe, color: 'bg-[#4ba1e6] text-white', trend: '+4%' },
    { label: 'Bookings',      value: bookings.length, icon: BookOpen, color: 'bg-[#6b5be2] text-white', trend: '+8%' },
    { label: 'Active trips',  value: trips.filter(t => t.status === 'upcoming' || t.status === 'confirmed').length, icon: Plane, color: 'bg-[#35c089] text-white', trend: '+3%' },
    { label: 'New messages',  value: messages.filter(m => isNewMessage(m.status)).length, icon: MessageSquare, color: 'bg-[#ff8f3d] text-white', trend: '' },
  ];

  const filteredUsers    = users.filter(u => u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredBookings = bookings.filter((booking) => {
    const query = search.toLowerCase();
    return !query || [
      booking.id,
      booking.itineraryId,
      booking.flightName,
      booking.hotelName,
      booking.location,
      booking.userId,
      booking.checkIn,
      booking.checkOut,
    ].some((value) => value?.toLowerCase().includes(query));
  });
  const filteredTrips    = trips.filter(t => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.destination?.toLowerCase().includes(search.toLowerCase());
    const matchUser   = !tripUserFilter || `${t.userId || ''} ${t.userName || ''} ${t.userEmail || ''}`.toLowerCase().includes(tripUserFilter.toLowerCase());
    const matchDest   = !tripDestFilter || (t.destination || '').toLowerCase().includes(tripDestFilter.toLowerCase());
    return matchSearch && matchUser && matchDest;
  });
  // Pagination for trips tab
  const pagedTrips = filteredTrips.slice((tripsPage - 1) * TRIPS_PER_PAGE, tripsPage * TRIPS_PER_PAGE);
  const tripsTotalPages = Math.ceil(filteredTrips.length / TRIPS_PER_PAGE);
  const filteredMessages = messages.filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.topic?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-purple-600 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-semibold">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── TOP HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 px-6 pt-24 pb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Admin · Operations centre</p>
            <h1 className="text-4xl md:text-5xl font-black text-white">Voyage Dashboard</h1>
            <p className="text-slate-400 mt-2 text-sm">All users, trips, and bookings in one control room.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-sm">
              <p className="text-white/60 text-xs">Signed in as</p>
              <p className="text-white font-bold">{currentAdmin?.displayName || 'Admin'}</p>
            </div>
            <button onClick={loadData} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {dataWarning && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold rounded-2xl px-5 py-4">
            <AlertCircle size={16} /> {dataWarning}
          </div>
        )}

        {/* ── KPI GRID ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm cursor-pointer hover:shadow-md transition"
                onClick={() => {
                  if (k.label === 'Open messages') setTab('messages');
                  else if (k.label === 'Active trips') setTab('trips');
                  else if (k.label === 'Total users') setTab('users');
                  else if (k.label === 'Bookings') setTab('bookings');
                }}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${k.color}`}><Icon size={20} /></div>
                  {k.trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{k.trend}</span>}
                </div>
                <p className="text-3xl font-black text-slate-900">{k.value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{k.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── TABS ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 flex-wrap">
            {(['overview', 'users', 'bookings', 'trips', 'destinations', 'messages'] as DashTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize transition relative ${
                  tab === t ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}>
                {t}
                {t === 'messages' && messages.filter(m => isNewMessage(m.status)).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {messages.filter(m => isNewMessage(m.status)).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          {tab !== 'overview' && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-56" />
            </div>
          )}
        </div>

        {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid xl:grid-cols-[1fr_340px] gap-6">
            {/* Trending destinations */}
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={16} className="text-purple-600" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Trending places</p>
                  <h2 className="font-black text-slate-900 text-lg">Top destinations</h2>
                </div>
              </div>
              {destinations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Globe size={40} strokeWidth={1.2} />
                  <p className="text-sm">No destinations loaded yet.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {destinations.slice(0, 4).map(dest => (
                    <div
                      key={dest.id}
                      className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg"
                      onClick={() => openDestinationResults(dest.name)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDestinationResults(dest.name);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <img
                        src={dest.imageUrl || getDynamicImage(dest.type, dest.name)}
                        className="h-40 w-full object-cover" loading="lazy" referrerPolicy="no-referrer"
                        alt={dest.name}
                        onError={handleImageError} />
                      <div className="p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{dest.type}</span>
                        <p className="font-black text-slate-900 mt-2">{dest.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={10} />{dest.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Recent users */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-slate-900">Recent users</h3>
                  <button onClick={() => setTab('users')} className="text-xs text-purple-600 font-semibold">See all →</button>
                </div>
                <div className="space-y-3">
                  {users.slice(0, 4).map(u => (
                    <div key={u.uid} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm shrink-0">
                        {(u.displayName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{u.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking status overview */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="font-black text-slate-900 mb-5">Booking overview</h3>
                {[
                  { label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length, color: 'bg-emerald-500' },
                  { label: 'Pending',   count: bookings.filter(b => b.status === 'pending').length,   color: 'bg-amber-500' },
                  { label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length, color: 'bg-rose-500' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className={`w-2 h-2 rounded-full ${row.color}`} />
                    <p className="text-sm text-slate-700 flex-1">{row.label}</p>
                    <p className="font-black text-slate-900">{row.count}</p>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full`}
                        style={{ width: bookings.length ? `${(row.count / bookings.length) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin info */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={16} className="text-purple-400" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin session</p>
                </div>
                <p className="font-black text-lg">{currentAdmin?.displayName || 'Admin'}</p>
                <p className="text-slate-400 text-sm mt-0.5">{currentAdmin?.email}</p>
                <span className="inline-block mt-3 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ USERS ════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Registered accounts</p>
                <h2 className="text-xl font-black text-slate-900">All users <span className="text-slate-400 font-semibold text-base">({filteredUsers.length})</span></h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['User','Email','Role','Joined','Actions'].map(h => (
                      <th key={h} className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => {
                    const isCurrent = currentAdmin?.email?.toLowerCase() === user.email.toLowerCase();
                    return (
                      <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-7 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-black flex items-center justify-center text-sm shrink-0">
                              {(user.displayName || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{user.displayName}</p>
                              {isCurrent && <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">You</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-7 py-4 text-sm text-slate-600">{user.email}</td>
                        <td className="px-7 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-7 py-4 text-sm text-slate-500">
                          {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-7 py-4">
                          <button onClick={() => handleDeleteUser(user.uid)} disabled={isCurrent}
                            className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-xl hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition">
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ BOOKINGS ══════════════════════════════════════════════ */}
        {tab === 'bookings' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Booking pipeline</p>
                <h2 className="text-xl font-black text-slate-900">All bookings <span className="text-slate-400 font-semibold text-base">({filteredBookings.length})</span></h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Booking ID','Guest','Booking','Dates','Status','Total','Actions'].map(h => (
                      <th key={h} className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-7 py-4 font-mono text-sm text-slate-700">{booking.id}</td>
                      <td className="px-7 py-4 text-sm text-slate-600">
                        {users.find((user) => user.uid === booking.userId)?.displayName || booking.userId || '—'}
                      </td>
                      <td className="px-7 py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{booking.bookingType === 'flight' ? (booking.flightName || booking.hotelName) : booking.hotelName}</p>
                          <p className="text-xs text-slate-500">{booking.bookingType === 'flight' ? (booking.flightDetails ? `${booking.flightDetails.fromCode} -> ${booking.flightDetails.toCode}` : booking.location || booking.itineraryId || '—') : booking.location || booking.itineraryId || '—'}</p>
                        </div>
                      </td>
                      <td className="px-7 py-4 text-xs text-slate-500">
                        <div>{booking.checkIn || '—'} to {booking.checkOut || '—'}</div>
                        <div>{booking.guests} guest{booking.guests === 1 ? '' : 's'} · {new Date(booking.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-7 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                          booking.status === 'pending'   ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>{booking.status}</span>
                      </td>
                      <td className="px-7 py-4 font-black text-slate-900">{booking.currency} {booking.totalPrice.toLocaleString()}</td>
                      <td className="px-7 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateBooking(booking.id, 'confirmed')} title="Confirm"
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition"><CheckCircle size={15} /></button>
                          <button onClick={() => handleUpdateBooking(booking.id, 'cancelled')} title="Cancel"
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition"><XCircle size={15} /></button>
                          <button onClick={() => handleUpdateBooking(booking.id, 'pending')} title="Mark pending"
                            className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition"><Clock size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TRIPS ════════════════════════════════════════════════ */}
        {tab === 'trips' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">All itineraries</p>
                  <h2 className="text-xl font-black text-slate-900">User trips <span className="text-slate-400 font-semibold text-base">({filteredTrips.length})</span></h2>
                </div>
                <button onClick={loadData}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600 border border-slate-200 px-4 py-2 rounded-xl transition">
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={tripUserFilter} onChange={e => { setTripUserFilter(e.target.value); setTripsPage(1); }}
                    placeholder="Filter by user ID…" className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-48" />
                </div>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={tripDestFilter} onChange={e => { setTripDestFilter(e.target.value); setTripsPage(1); }}
                    placeholder="Filter by destination…" className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 w-52" />
                </div>
                {(tripUserFilter || tripDestFilter) && (
                  <button onClick={() => { setTripUserFilter(''); setTripDestFilter(''); setTripsPage(1); }}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl transition">
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Trip','Destination','Dates','Activities','Status','User','Actions'].map(h => (
                      <th key={h} className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedTrips.map(trip => (
                    <React.Fragment key={trip.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-7 py-4 font-bold text-slate-900 text-sm">{trip.title || 'Untitled'}</td>
                        <td className="px-7 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5"><MapPin size={12} className="text-purple-500" />{trip.destination || '—'}</div>
                        </td>
                        <td className="px-7 py-4 text-xs text-slate-500">{trip.startDate || '—'} – {trip.endDate || '—'}</td>
                        <td className="px-7 py-4 text-sm font-semibold text-slate-700">
                          {(trip.days || []).reduce((a, d) => a + (d.activities?.length || 0), 0)}
                        </td>
                        <td className="px-7 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            trip.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            trip.status === 'confirmed' ? 'bg-purple-50 text-purple-600' :
                            trip.status === 'upcoming'  ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{trip.status}</span>
                        </td>
                        <td className="px-7 py-4 text-xs text-slate-700">
                          {(() => {
                            const u = users.find(u => u.uid === trip.userId);
                            if (trip.userName || trip.userEmail) {
                              return <span className="font-semibold">{trip.userName || trip.userEmail}</span>;
                            }
                            return u ? (
                              <span className="font-semibold">{u.displayName || u.email}</span>
                            ) : (
                              <span className="font-mono text-slate-400">{trip.userId?.slice(0, 8)}...</span>
                            );
                          })()}
                        </td>
                        <td className="px-7 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition">
                              {expandedTripId === trip.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {expandedTripId === trip.id ? 'Hide' : 'Details'}
                            </button>
                            <button
                              onClick={() => handleDeleteTrip(trip.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedTripId === trip.id && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-7 py-5">
                            <div className="space-y-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                Day-by-day itinerary — {trip.title}
                              </p>
                              {(trip.days || []).length === 0 ? (
                                <p className="text-sm text-slate-400">No day plan available.</p>
                              ) : (
                                <div className="grid gap-3">
                                  {(trip.days || []).map((day: any) => (
                                    <div key={day.dayNumber} className="bg-white rounded-2xl border border-slate-200 p-4">
                                      <p className="text-sm font-bold text-slate-900 mb-2">
                                        Day {day.dayNumber}{day.title ? ` — ${day.title}` : ''}
                                      </p>
                                      {(day.activities || []).length === 0 ? (
                                        <p className="text-xs text-slate-400">No activities</p>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {(day.activities || []).map((act: any, ai: number) => (
                                            <span key={ai} className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-100">
                                              <span>{act.time || ''}</span>
                                              <span>{act.name || act.title || act.description || String(act)}</span>
                                              {act.cost && <span className="text-purple-400 font-normal">({act.cost})</span>}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {/* Pagination controls for trips tab */}
              <ResultPageNav page={tripsPage} total={tripsTotalPages} onPrev={() => setTripsPage(tripsPage - 1)} onNext={() => setTripsPage(tripsPage + 1)} />
            </div>
          </div>
        )}

        {/* ══ MESSAGES ══════════════════════════════════════════════ */}
        {tab === 'messages' && (
          <div className="space-y-6">
            {/* Message stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total', value: messages.length, color: 'bg-slate-50 text-slate-600' },
                { label: 'New', value: messages.filter(m => isNewMessage(m.status)).length, color: 'bg-rose-50 text-rose-600' },
                { label: 'Replied', value: messages.filter(m => m.status === 'replied').length, color: 'bg-slate-100 text-slate-500' },
              ].map(s => (
                <div key={s.label} className={`rounded-2xl p-5 border border-slate-200 bg-white`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className={`text-3xl font-black mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900">
                  Contact messages <span className="text-slate-400 font-semibold text-base">({filteredMessages.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/admin/contact')}
                    className="flex items-center gap-2 text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 px-4 py-2 rounded-xl transition">
                    <Eye size={13} /> Open manager
                  </button>
                  <button onClick={() => { void loadMessages(); }}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600 border border-slate-200 px-4 py-2 rounded-xl transition">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </div>

              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <MessageSquare size={40} className="mb-3 opacity-30" />
                  <p className="font-semibold">No messages yet</p>
                  <p className="text-sm">Contact form submissions will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredMessages.map(msg => (
                    <div key={msg.id} className="px-8 py-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-2">
                            <span className="font-bold text-slate-900 text-sm">{msg.name}</span>
                            <span className="text-slate-400 text-xs">{msg.email}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              msg.status === 'replied' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-600'
                            }`}>{msg.status === 'replied' ? 'replied' : 'new'}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{msg.id}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-2 flex-wrap">
                            <span className="font-semibold text-purple-600">{msg.topic}</span>
                            {msg.destination && <span className="flex items-center gap-1"><MapPin size={10} />{msg.destination}</span>}
                            {(msg.startDate || msg.endDate) && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {msg.startDate}{msg.endDate ? ` – ${msg.endDate}` : ''}
                              </span>
                            )}
                            <span className="text-slate-300">{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{msg.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={msg.status}
                            onChange={e => { void handleMessageStatus(msg.id, e.target.value as ContactMessage['status']); }}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400">
                            <option value="new">New</option>
                            <option value="replied">Replied</option>
                          </select>
                          <button onClick={() => { void handleDeleteMessage(msg.id); }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ DESTINATIONS ══════════════════════════════════════════ */}
        {tab === 'destinations' && (
          <div className="space-y-6">
            {/* Section header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Destination catalog</p>
                <h2 className="text-2xl font-black text-slate-900">
                  Top Destinations <span className="text-slate-400 font-semibold text-lg">({destinations.length})</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sort toggle */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => setDestSort('rating')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${destSort === 'rating' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    <TrendingUp size={12} /> Popularity
                  </button>
                  <button
                    onClick={() => setDestSort('name')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${destSort === 'name' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    A–Z
                  </button>
                </div>
                <button
                  onClick={openDestAdd}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm shadow-purple-500/20 transition">
                  <Plus size={15} /> Add Destination
                </button>
              </div>
            </div>

            {/* Cards grid */}
            {destinations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Globe size={52} strokeWidth={1.2} className="mb-4 text-slate-300" />
                <p className="font-bold text-slate-700 text-lg">No destinations yet</p>
                <p className="text-sm mt-1 mb-6">Add your first top destination to get started.</p>
                <button onClick={openDestAdd}
                  className="flex items-center gap-2 bg-purple-600 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-purple-700 transition">
                  <Plus size={15} /> Add First Destination
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...destinations]
                  .sort((a, b) => destSort === 'rating' ? b.rating - a.rating : a.name.localeCompare(b.name))
                  .map((dest, i) => {
                    const isTrending = destSort === 'rating' && i < 3;
                    const typeColors: Record<string, string> = {
                      hotel: 'bg-sky-50 text-sky-600',
                      restaurant: 'bg-rose-50 text-rose-600',
                      attraction: 'bg-emerald-50 text-emerald-600',
                    };
                    return (
                      <motion.div
                        key={dest.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => openDestinationResults(dest.name)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDestinationResults(dest.name);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {/* Card image */}
                        <div className="relative h-48 overflow-hidden bg-slate-100">
                          <img
                            src={dest.imageUrl || getDynamicImage(dest.type, dest.name)}
                            alt={dest.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                          {isTrending && (
                            <div className="absolute top-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                              <Award size={10} /> Trending
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="text-white font-black text-lg leading-tight line-clamp-1">{dest.name}</p>
                            <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {dest.location}
                            </p>
                          </div>
                        </div>

                        {/* Card body */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${typeColors[dest.type] || 'bg-slate-100 text-slate-500'}`}>
                              {dest.type}
                            </span>
                            {/* Popularity score */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={10}
                                    className={s <= Math.round(dest.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
                                ))}
                              </div>
                              <span className="text-sm font-black text-slate-800">{dest.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          {dest.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{dest.description}</p>
                          )}

                          {dest.priceRange && (
                            <p className="text-xs font-semibold text-emerald-600 mb-3">{dest.priceRange}</p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                            <button
                              onClick={(event) => { event.stopPropagation(); openDestEdit(dest); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-50 text-purple-600 text-xs font-bold rounded-xl hover:bg-purple-100 transition">
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={(event) => { event.stopPropagation(); void handleDeleteDest(dest.id); }}
                              className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Destination Add / Edit Modal ── */}
      <AnimatePresence>
        {destAddOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDestAddOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">
                    {destEditItem ? 'Edit destination' : 'New destination'}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900">
                    {destEditItem ? `Edit "${destEditItem.name}"` : 'Add Top Destination'}
                  </h3>
                </div>
                <button onClick={() => setDestAddOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveDest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Destination Name *</label>
                  <input required type="text" value={destForm.name}
                    onChange={e => setDestForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Santorini"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Country / Location *</label>
                  <input required type="text" value={destForm.location}
                    onChange={e => setDestForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Greece"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <select value={destForm.type}
                    onChange={e => setDestForm(f => ({ ...f, type: e.target.value as Destination['type'] }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition">
                    <option value="attraction">Attraction / Place to Visit</option>
                    <option value="hotel">Hotel / Accommodation</option>
                    <option value="restaurant">Restaurant / Dining</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                  <textarea rows={3} value={destForm.description}
                    onChange={e => setDestForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief description of this destination…"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none transition" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cover Image Upload</label>
                  <input type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleDestinationImageSelected}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition file:mr-3 file:rounded-lg file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-purple-700 hover:file:bg-purple-100" />
                  <p className="mt-2 text-xs text-slate-500">PNG, JPG, WEBP, or GIF up to 5MB.</p>
                  {destImageError && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{destImageError}</p>
                  )}
                  {(destImagePreview || destForm.imageUrl) && (
                    <div className="mt-2 rounded-xl overflow-hidden h-28 border border-slate-200">
                      <img src={destImagePreview || destForm.imageUrl} alt="preview"
                        className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Price Range</label>
                    <input type="text" value={destForm.priceRange}
                      onChange={e => setDestForm(f => ({ ...f, priceRange: e.target.value }))}
                      placeholder="$50–$200/night"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Popularity (0–5)</label>
                    <input type="number" min={0} max={5} step={0.1} value={destForm.rating}
                      onChange={e => setDestForm(f => ({ ...f, rating: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 transition" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setDestAddOpen(false)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={destSaving}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-60 hover:shadow-lg hover:shadow-purple-500/25 transition">
                    {destSaving ? 'Saving…' : destEditItem ? 'Update Destination' : 'Add Destination'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
