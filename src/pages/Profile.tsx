import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { itineraryService, Itinerary, favoritesService, FavoriteItem, messageService, ContactMessage } from '../lib/services';
import { apiFetch } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { travelImg } from '../lib/utils';
import Footer from '../components/Footer';
import {
  User,
  Plane,
  Calendar,
  CheckCircle,
  Globe,
  Settings,
  Lock,
  Eye,
  EyeOff,
  Save,
  LogOut,
  MapPin,
  ChevronRight,
  Shield,
  Heart,
  MessageSquare,
  Camera,
  Trash2,
  AlertTriangle,
  Star,
  X,
  Bell,
  ExternalLink,
  Bookmark,
  TrendingUp,
  Plus,
  LayoutGrid,
  ChevronLeft,
} from 'lucide-react';

type Tab = 'overview' | 'trips' | 'favorites' | 'messages' | 'profile' | 'settings';

export default function ProfilePage() {
  const { profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('overview');
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsPage, setTripsPage] = useState(1);
  const TRIPS_PER_PAGE = 6;
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteTypeFilter, setFavoriteTypeFilter] = useState<'all' | 'hotel' | 'restaurant'>('all');
  const [favDetail, setFavDetail] = useState<FavoriteItem | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveMsgError, setSaveMsgError] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ── Pagination helper component ── */
  const ResultPageNav = ({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) => {
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
  };

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.displayName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.uid) return;
    setTripsLoading(true);
    itineraryService
      .getByUser(profile.uid)
      .then(setTrips)
      .finally(() => setTripsLoading(false));
  }, [profile?.uid]);

  useEffect(() => {
    const refreshFavorites = async () => setFavorites(await favoritesService.getAll());
    refreshFavorites().catch(console.error);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'voyage_favorites') refreshFavorites().catch(console.error);
    };
    window.addEventListener('storage', onStorage);
    const timer = setInterval(() => { refreshFavorites().catch(console.error); }, 8000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    messageService.getMine().then(setMessages).catch(() => setMessages([]));
  }, [profile?.uid]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    setSaveMsgError(false);
    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone }),
      });
      setSaveMsg('Profile updated successfully!');
      setSaveMsgError(false);
      // Refresh in background — don't let it block or override the success message
      refreshProfile().catch(() => undefined);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save profile. Please try again.';
      setSaveMsg(msg);
      setSaveMsgError(true);
    } finally {
      setSaving(false);
      setTimeout(() => { setSaveMsg(''); setSaveMsgError(false); }, 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
          confirmPassword: pwForm.confirm,
        }),
      });
      setPwMsg('Password updated successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch {
      setPwMsg('Current password is incorrect.');
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(''), 3500);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setAvatarMsg('Image must be under 2 MB.'); return; }
    setAvatarUploading(true);
    setAvatarMsg('');
    // Resize image to max 256×256 before encoding to base64
    const resized = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(blobUrl);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = blobUrl;
    });
    // Optimistically show the resized preview immediately
    setLocalAvatarPreview(resized);
    try {
      await apiFetch('/api/users/me/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ profileImage: resized }),
      });
      await refreshProfile();
      setAvatarMsg('Profile photo updated!');
    } catch (err: any) {
      setLocalAvatarPreview(null);
      setAvatarMsg(err?.message || 'Failed to upload photo.');
    } finally {
      setAvatarUploading(false);
      setTimeout(() => setAvatarMsg(''), 3500);
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarUploading(true);
    setAvatarMsg('');
    try {
      await apiFetch('/api/users/me/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ profileImage: '' }),
      });
      setLocalAvatarPreview(null);
      await refreshProfile();
      setAvatarMsg('Profile photo removed.');
    } catch (err: any) {
      setAvatarMsg(err?.message || 'Failed to remove photo.');
    } finally {
      setAvatarUploading(false);
      setTimeout(() => setAvatarMsg(''), 3500);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiFetch('/api/users/me', { method: 'DELETE' });
      await logout();
      navigate('/login');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const initials = (profile?.displayName || 'T')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const stats = [
    { label: 'Total Trips', value: trips.length, icon: Plane },
    { label: 'Upcoming', value: trips.filter((t) => t.status === 'upcoming').length, icon: Calendar },
    { label: 'Completed', value: trips.filter((t) => t.status === 'completed').length, icon: CheckCircle },
    { label: 'Countries', value: new Set(trips.map((t) => t.destination).filter(Boolean)).size, icon: Globe },
  ];

  const repliedMessages = useMemo(() => messages.filter((item) => item.status === 'replied'), [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-purple-50/30">
      <div className="pt-24 md:pt-28 pb-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[300px_1fr] gap-6 md:gap-8 items-start">

        {/* ══ SIDEBAR ══ */}
        <aside className="lg:sticky lg:top-28 rounded-3xl overflow-hidden shadow-lg border border-slate-200/80">
          {/* Cover / hero */}
          <div className="relative h-28 bg-gradient-to-br from-purple-700 via-indigo-700 to-slate-900 overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=600&q=60)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          </div>

          {/* Avatar anchored at cover border */}
          <div className="bg-white px-6 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div
                className="relative w-20 h-20 cursor-pointer group shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Change profile photo"
              >
                {(localAvatarPreview || profile?.profileImage) ? (
                  <img
                    src={localAvatarPreview || profile!.profileImage!}
                    alt="avatar"
                    className="w-20 h-20 rounded-2xl object-cover shadow-xl ring-4 ring-white"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shadow-xl ring-4 ring-white">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  {avatarUploading
                    ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={18} className="text-white" />}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              {profile?.role === 'admin' && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase mb-1">
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>

            <p className="font-black text-slate-900 text-lg leading-tight">{profile?.displayName || 'Traveler'}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{profile?.email}</p>
            {avatarMsg && (
              <p className={`text-xs font-semibold mt-2 px-2 py-1 rounded-lg ${avatarMsg.includes('ail') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {avatarMsg}
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="bg-white border-t border-slate-100 px-3 py-3 space-y-0.5">
            {([
              ['overview',  'Overview',      LayoutGrid, 'text-purple-600'],
              ['trips',     'My Trips',      Plane,      'text-sky-600'],
              ['favorites', 'Saved Places',  Bookmark,   'text-rose-500'],
              ['profile',   'Edit Profile',  User,       'text-indigo-600'],
              ['settings',  'Settings',      Settings,   'text-slate-600'],
              ['messages',  'Support',       MessageSquare, 'text-amber-600'],
            ] as [Tab, string, React.ElementType, string][]).map(([k, label, Icon, iconCol]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === k
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`${tab === k ? 'text-white' : iconCol}`}>
                  <Icon size={15} />
                </span>
                {label}
                {k === 'messages' && repliedMessages.length > 0 && (
                  <span className="ml-auto bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {repliedMessages.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sidebar actions */}
          <div className="bg-white border-t border-slate-100 px-4 py-4 space-y-2">
            <button
              onClick={() => navigate('/itinerary')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl py-2.5 shadow-sm shadow-purple-500/20 transition"
            >
              <Plus size={14} /> New Trip
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 font-bold text-sm rounded-xl py-2.5 hover:bg-rose-100 transition"
            >
              <LogOut size={14} /> Logout
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-slate-400 font-semibold text-xs py-2 hover:text-rose-500 transition"
            >
              <span className="inline-flex items-center gap-1.5"><Trash2 size={12} /> Delete account</span>
            </button>
          </div>
        </aside>

        <main className="space-y-5 min-w-0">
          {/* ── Stats bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total Trips',  value: trips.length,                                                    icon: Plane,        gradient: 'from-purple-500 to-indigo-600' },
              { label: 'Upcoming',     value: trips.filter(t => t.status === 'upcoming').length,               icon: Calendar,     gradient: 'from-sky-500 to-blue-600' },
              { label: 'Completed',    value: trips.filter(t => t.status === 'completed').length,              icon: CheckCircle,  gradient: 'from-emerald-500 to-teal-600' },
              { label: 'Destinations', value: new Set(trips.map(t => t.destination).filter(Boolean)).size,     icon: Globe,        gradient: 'from-rose-500 to-pink-600' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black text-slate-900">{tripsLoading ? '—' : s.value}</p>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight mt-0.5">{s.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.section
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                {/* Welcome card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl">
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=60)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="relative">
                    <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">Welcome back</p>
                    <h2 className="text-2xl md:text-3xl font-black leading-tight">
                      Hello, {(profile?.displayName || 'Traveler').split(' ')[0]}! ✈️
                    </h2>
                    <p className="text-white/60 text-sm mt-1.5">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button onClick={() => navigate('/itinerary')}
                        className="flex items-center gap-2 bg-white text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/90 transition shadow">
                        <Plus size={14} /> New Trip
                      </button>
                      <button onClick={() => navigate('/destinations')}
                        className="flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/20 transition">
                        <TrendingUp size={14} /> Explore Places
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid md:grid-cols-3 gap-3 md:gap-4">
                  {[
                    { title: 'Plan a New Trip',    desc: 'Build your day-by-day itinerary.',       to: '/itinerary',    icon: Plane,    grad: 'from-purple-500 to-indigo-600' },
                    { title: 'Explore Places',     desc: 'Search destinations, hotels & more.',    to: '/destinations', icon: Globe,    grad: 'from-sky-500 to-blue-600' },
                    { title: 'Travel Stories',     desc: 'Read guides and recommendations.',        to: '/blogs',        icon: ExternalLink, grad: 'from-rose-500 to-pink-600' },
                  ].map(card => {
                    const Icon = card.icon;
                    return (
                      <Link key={card.title} to={card.to}
                        className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                          <Icon size={17} />
                        </div>
                        <p className="font-black text-slate-900 text-sm">{card.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{card.desc}</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-600">
                          Open <ChevronRight size={11} className="group-hover:translate-x-0.5 transition" />
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {/* Recent trips preview */}
                {!tripsLoading && trips.length > 0 && (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-black text-slate-900">Recent Trips</p>
                      <button onClick={() => setTab('trips')} className="text-xs font-bold text-purple-600 hover:underline">
                        View all →
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {trips.slice(0, 3).map(trip => (
                        <Link key={trip.id} to="/itinerary"
                          className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                          <div className="relative h-28 overflow-hidden">
                            <img
                              src={travelImg(trip.destination || 'travel city', (trip.id || '').charCodeAt(0) % 20)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy" alt={trip.destination || 'trip'} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3">
                              <p className="text-white font-black text-sm leading-tight truncate">{trip.title || 'Untitled trip'}</p>
                            </div>
                            <span className={`absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              trip.status === 'completed' ? 'bg-emerald-400 text-emerald-900' :
                              trip.status === 'confirmed' ? 'bg-purple-400 text-white' :
                              trip.status === 'upcoming'  ? 'bg-sky-400 text-white' :
                              'bg-white/80 text-slate-700'
                            }`}>{trip.status}</span>
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{trip.destination || 'TBD'}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {tab === 'trips' && (
              <motion.section
                key="trips"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">My Itineraries</p>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">All Trips <span className="text-slate-400 font-semibold text-base">({trips.length})</span></h2>
                  </div>
                  <button onClick={() => navigate('/itinerary')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-purple-500/20">
                    <Plus size={14} /> New Trip
                  </button>
                </div>
                {tripsLoading ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : trips.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <Plane size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-slate-700">No trips yet</p>
                    <p className="text-sm text-slate-500 mt-1">Start planning your next adventure.</p>
                    <Link to="/itinerary"
                      className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition">
                      <Plus size={13} /> Create First Trip
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {trips.slice((tripsPage - 1) * TRIPS_PER_PAGE, tripsPage * TRIPS_PER_PAGE).map(trip => (
                        <div key={trip.id} 
                          onClick={() => navigate(`/itinerary?expandTrip=${trip.id}`)}
                          className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                          <div className="relative h-36 overflow-hidden">
                            <img
                              src={travelImg(trip.destination || 'travel city', (trip.id || '').charCodeAt(0) % 20)}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy" alt={trip.destination || 'trip'} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                            <span className={`absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                              trip.status === 'completed' ? 'bg-emerald-400 text-emerald-900' :
                              trip.status === 'confirmed' ? 'bg-purple-500 text-white' :
                              trip.status === 'upcoming'  ? 'bg-sky-500 text-white' :
                              'bg-white/80 text-slate-700'
                            }`}>{trip.status}</span>
                            <div className="absolute bottom-3 left-3 right-3">
                              <p className="text-white font-black text-base leading-tight truncate">{trip.title || 'Untitled trip'}</p>
                            </div>
                          </div>
                          <div className="p-4 flex items-center justify-between">
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium"><MapPin size={11} className="text-purple-500" />{trip.destination || 'Destination TBD'}</p>
                            <span className="text-[11px] text-slate-400">{trip.startDate || 'TBD'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {Math.ceil(trips.length / TRIPS_PER_PAGE) > 1 && (
                      <ResultPageNav 
                        page={tripsPage} 
                        total={Math.ceil(trips.length / TRIPS_PER_PAGE)} 
                        onPrev={() => setTripsPage(tripsPage - 1)} 
                        onNext={() => setTripsPage(tripsPage + 1)} 
                      />
                    )}
                  </div>
                )}
              </motion.section>
            )}

            {tab === 'favorites' && (
              <motion.section
                key="favorites"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Saved Places</p>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">Your Favorites</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['all', 'hotel', 'restaurant'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFavoriteTypeFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition ${
                          favoriteTypeFilter === f ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {favorites.filter(item => {
                  const kind = item.propertyType.toLowerCase().includes('hotel') ? 'hotel' : item.propertyType.toLowerCase().includes('restaurant') ? 'restaurant' : 'hotel';
                  return favoriteTypeFilter === 'all' || favoriteTypeFilter === kind;
                }).length === 0 ? (
                  <div className="text-center py-14 text-slate-400">
                    <Bookmark size={34} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-slate-700">No saved places yet</p>
                    <p className="text-xs mt-1">Save hotels or restaurants from the Destinations page.</p>
                    <button onClick={() => navigate('/destinations')}
                      className="inline-flex items-center gap-2 mt-4 bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition">
                      Explore Places
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites
                      .filter((item) => {
                        const kind = item.propertyType.toLowerCase().includes('hotel') ? 'hotel' : item.propertyType.toLowerCase().includes('restaurant') ? 'restaurant' : 'hotel';
                        return favoriteTypeFilter === 'all' || favoriteTypeFilter === kind;
                      })
                      .map((item) => (
                        <motion.article
                          key={item.id}
                          whileHover={{ scale: 1.03, y: -4 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                          onClick={() => setFavDetail(item)}
                          className="rounded-2xl overflow-hidden border border-slate-200 cursor-pointer hover:shadow-xl transition-shadow"
                        >
                          <div className="relative h-36 overflow-hidden">
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            <span className="absolute bottom-2 left-2 bg-white/90 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-full capitalize">{item.propertyType}</span>
                          </div>
                          <div className="p-3.5">
                            <p className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={10} />{item.city}{item.country ? `, ${item.country}` : ''}</p>
                            <div className="mt-2.5 flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">{item.currency} {item.price}</span>
                              <span className="flex items-center gap-1 text-amber-500 text-xs font-semibold"><Star size={11} fill="currentColor" />{item.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                  </div>
                )}
              </motion.section>
            )}

            {tab === 'profile' && (
              <motion.section
                key="profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid xl:grid-cols-2 gap-6"
              >
                {/* Profile info form */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account</p>
                      <h2 className="text-xl font-black text-slate-900">Update Profile</h2>
                    </div>
                  </div>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Full name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="Email"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="Phone number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    {saveMsg && (
                      <p className={`text-xs font-semibold px-3 py-2 rounded-lg ${saveMsgError ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {saveMsg}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl py-3 transition inline-flex items-center justify-center gap-2"
                    >
                      <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </form>
                </div>

                {/* Avatar section */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white">
                      <Camera size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Photo</p>
                      <h2 className="text-xl font-black text-slate-900">Profile Picture</h2>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-5">
                    <div
                      className="relative w-28 h-28 cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {(localAvatarPreview || profile?.profileImage) ? (
                        <img src={localAvatarPreview || profile!.profileImage!} alt="avatar" className="w-28 h-28 rounded-3xl object-cover shadow-xl" />
                      ) : (
                        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center text-4xl font-black shadow-xl shadow-purple-500/30">
                          {(profile?.displayName || 'T').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">Click photo to change</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2 MB</p>
                    </div>
                    {avatarMsg && (
                      <p className={`text-xs font-semibold px-3 py-2 rounded-lg ${avatarMsg.toLowerCase().includes('fail') || avatarMsg.toLowerCase().includes('error') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {avatarMsg}
                      </p>
                    )}
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition"
                      >
                        {avatarUploading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={14} />}
                        Upload Photo
                      </button>
                      {profile?.profileImage && (
                        <button
                          onClick={handleDeleteAvatar}
                          disabled={avatarUploading}
                          className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm px-4 py-2.5 rounded-xl border border-rose-200 transition"
                          title="Remove photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-xs font-black uppercase tracking-widest text-rose-400 mb-3">Danger Zone</p>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center gap-2 justify-center py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-sm font-bold transition"
                    >
                      <Trash2 size={14} /> Delete Account
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {tab === 'settings' && (
              <motion.section
                key="settings"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid xl:grid-cols-2 gap-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white">
                      <Lock size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security</p>
                      <h2 className="text-xl font-black text-slate-900">Change Password</h2>
                    </div>
                  </div>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                        placeholder="Current password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        required
                      />
                    </div>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm.next}
                      onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                      placeholder="New password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      required
                    />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="text-xs font-bold text-slate-500 inline-flex items-center gap-1"
                    >
                      {showPw ? <EyeOff size={12} /> : <Eye size={12} />} {showPw ? 'Hide passwords' : 'Show passwords'}
                    </button>
                    {pwMsg && <p className="text-xs font-semibold text-slate-600">{pwMsg}</p>}
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="w-full bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl py-3 transition inline-flex items-center justify-center gap-2"
                    >
                      <Lock size={14} /> {pwSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
                      <Bell size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications</p>
                      <h2 className="text-xl font-black text-slate-900">Preferences</h2>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Trip reminders', sub: 'Get notified before your trips' },
                      { label: 'New destinations', sub: 'Discover trending places' },
                      { label: 'Price alerts', sub: 'Hotels & flights near you' },
                      { label: 'Weekly digest', sub: 'Curated travel inspiration' },
                    ].map(({ label, sub }) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500">{sub}</p>
                        </div>
                        <button
                          type="button"
                          className="w-11 h-6 rounded-full bg-purple-600 relative shrink-0 transition-colors"
                          aria-label={`Toggle ${label}`}
                        >
                          <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white shadow" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Account</p>
                    <button
                      type="button"
                      onClick={() => { /* switch to profile tab */ }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-sm font-bold transition"
                    >
                      Edit Profile Info
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {tab === 'messages' && (
              <motion.section
                key="messages"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Help Center</p>
                      <h2 className="text-xl font-black text-slate-900">Support Messages</h2>
                    </div>
                  </div>
                  <div className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                    {repliedMessages.length} replied
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="text-center py-14 text-slate-400">
                    <MessageSquare size={30} className="mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No support messages yet</p>
                    <Link to="/contact" className="text-sm text-purple-600 underline mt-2 inline-block">Contact support</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                          <div>
                            <p className="font-bold text-slate-900">{item.topic || 'General enquiry'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{new Date(item.createdAt).toLocaleString()} · {item.id}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${item.status === 'replied' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {item.status === 'replied' ? 'Replied' : 'Pending'}
                          </span>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Your message</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                          </div>
                          {item.reply && (
                            <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4">
                              <p className="text-xs font-black uppercase tracking-wider text-purple-500 mb-2">Admin reply</p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{item.reply}</p>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
      </div>

      {/* ── Delete account confirmation modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Delete Account?</h3>
              <p className="text-slate-500 text-sm mb-6">
                This will permanently delete your account, all trips, and saved places. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Trash2 size={14} /> Yes, delete</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Favorite Detail Popup ── */}
      <AnimatePresence>
        {favDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setFavDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <img src={favDetail.imageUrl} alt={favDetail.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <button
                  onClick={() => setFavDetail(null)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full shadow transition"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white font-black text-xl leading-tight">{favDetail.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-amber-400 text-xs font-bold"><Star size={11} fill="currentColor" /> {favDetail.rating.toFixed(1)}</span>
                    <span className="text-white/70 text-xs capitalize">{favDetail.propertyType}</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="text-purple-500 shrink-0" />
                  <span>{favDetail.city}{favDetail.country ? `, ${favDetail.country}` : ''}</span>
                </div>
                {favDetail.price && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-slate-400 text-xs">Approx. price:</span>
                    <span className="font-bold text-slate-900">{favDetail.currency} {favDetail.price}</span>
                  </div>
                )}
                {favDetail.notes && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Your Notes</p>
                    {favDetail.notes}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setFavDetail(null); navigate('/destinations', { state: { to: favDetail.city } }); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-3 rounded-xl transition shadow-sm shadow-purple-500/30"
                  >
                    <ExternalLink size={14} /> Explore {favDetail.city}
                  </button>
                  <button
                    onClick={() => setFavDetail(null)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
