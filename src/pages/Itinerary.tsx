import React, { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { bookingService, itineraryService, type Itinerary } from '../lib/services.ts';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  Plus, Calendar, MapPin, Trash2, Edit2, X, ChevronDown,
  ChevronUp, Clock, Plane, Hotel, UtensilsCrossed, Landmark,
  LayoutGrid, Table2, Sparkles, CheckCircle2, Circle, AlertCircle, ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { travelImg } from '../lib/utils';

/* ── helpers ─────────────────────────────────────────── */
const DEST_IMGS: Record<string, string> = {
  paris:     'https://images.unsplash.com/photo-1431274172761-fcdab704a698?auto=format&fit=crop&w=900&q=80',
  tokyo:     'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
  bali:      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
  singapore: 'https://images.unsplash.com/photo-1525625232717-121ed31e22e7?auto=format&fit=crop&w=900&q=80',
  rome:      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80',
  london:    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
  'new york':'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80',
  dubai:     'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80',
  seoul:     'https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?auto=format&fit=crop&w=900&q=80',
};
function destImg(dest: string) {
  const key = (dest || '').toLowerCase();
  const matched = Object.entries(DEST_IMGS).find(([k]) => key.includes(k));
  return matched ? matched[1] : travelImg(dest || 'travel city', 0);
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600',   icon: Circle },
  upcoming:  { label: 'Upcoming',  color: 'bg-blue-50 text-blue-700',      icon: Plane },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700',icon: CheckCircle2 },
  completed: { label: 'Completed', color: 'bg-purple-50 text-purple-700',  icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

/* ── Activity note icon ──────────────────────────────── */
function actIcon(notes: string) {
  const n = (notes || '').toLowerCase();
  if (n.includes('hotel') || n.includes('🏨')) return Hotel;
  if (n.includes('restaurant') || n.includes('🍽') || n.includes('food')) return UtensilsCrossed;
  if (n.includes('attraction') || n.includes('📍') || n.includes('museum') || n.includes('park')) return Landmark;
  return Clock;
}

function activityPrice(activity: Itinerary['days'][number]['activities'][number]) {
  return typeof activity.price === 'number' ? activity.price : 0;
}

function activityBookedPrice(activity: Itinerary['days'][number]['activities'][number]) {
  const bookings = Array.isArray(activity.bookings) ? activity.bookings : [];
  if (bookings.length === 0) {
    return activityPrice(activity);
  }

  return bookings.reduce(
    (sum, booking) => (booking.status === 'cancelled' ? sum : sum + booking.totalPrice),
    0,
  );
}

function tripTotalPrice(trip: Itinerary) {
  return (trip.days || []).reduce(
    (sum: number, day: Itinerary['days'][number]) => sum + (day.activities || []).reduce(
      (daySum: number, activity: Itinerary['days'][number]['activities'][number]) => daySum + activityBookedPrice(activity),
      0,
    ),
    0,
  );
}

function tripCurrency(trip: Itinerary) {
  return (trip.days || [])
    .flatMap((day: Itinerary['days'][number]) => day.activities || [])
    .flatMap((activity: Itinerary['days'][number]['activities'][number]) => [
      ...(activity.bookings || []).filter((booking) => booking.status !== 'cancelled').map((booking) => booking.currency),
      activity.currency,
    ])
    .find((currency): currency is string => Boolean(currency)) || 'USD';
}

function formatMoney(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function itineraryFileName(trip: Itinerary) {
  const base = `${trip.title || 'itinerary'}-${trip.destination || 'trip'}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'itinerary';

  return `${base}.pdf`;
}

function downloadTripPdf(trip: Itinerary) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const maxWidth = pageWidth - marginX * 2;
  let cursorY = 52;

  const ensureSpace = (heightNeeded = 24) => {
    if (cursorY + heightNeeded <= pageHeight - 44) {
      return;
    }

    doc.addPage();
    cursorY = 52;
  };

  const writeLines = (text: string, fontSize = 11, color: [number, number, number] = [51, 65, 85], gap = 16) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    ensureSpace(lines.length * gap + 4);
    doc.text(lines, marginX, cursorY);
    cursorY += lines.length * gap;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text(trip.title || 'Untitled trip', marginX, cursorY);
  cursorY += 28;

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`${trip.destination || 'No destination'} • ${trip.startDate || 'TBD'} to ${trip.endDate || 'TBD'}`, marginX, cursorY);
  cursorY += 18;

  doc.setTextColor(5, 150, 105);
  doc.text(`Total trip price: ${formatMoney(tripTotalPrice(trip), tripCurrency(trip))}`, marginX, cursorY);
  cursorY += 28;

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 22;

  if (!trip.days || trip.days.length === 0) {
    writeLines('No activities planned yet.');
  }

  for (const day of trip.days || []) {
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(109, 40, 217);
    doc.text(`Day ${day.dayNumber}`, marginX, cursorY);
    cursorY += 20;

    if (!day.activities || day.activities.length === 0) {
      writeLines('No activities for this day.', 11, [148, 163, 184]);
      cursorY += 6;
      continue;
    }

    for (const activity of day.activities) {
      const activityTitle = activity.placeName || activity.placeId || 'Activity';
      ensureSpace(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${activity.time || '09:00'} • ${activityTitle}`, marginX, cursorY);
      cursorY += 16;

      if (activity.notes) {
        writeLines(activity.notes, 10, [71, 85, 105], 14);
      }

      const activityAmount = activityBookedPrice(activity);
      if (activityAmount > 0) {
        writeLines(`Cost: ${formatMoney(activityAmount, activity.currency || tripCurrency(trip))}`, 10, [5, 150, 105], 14);
      }

      const bookings = activity.bookings || [];
      for (const booking of bookings) {
        const bookingName = booking.bookingType === 'flight'
          ? (booking.flightName || booking.hotelName)
          : booking.hotelName;
        writeLines(
          `Booking: ${bookingName} | ${booking.checkIn} to ${booking.checkOut} | ${booking.status.toUpperCase()} | ${formatMoney(booking.totalPrice, booking.currency)}`,
          10,
          booking.status === 'cancelled' ? [225, 29, 72] : [3, 105, 161],
          14,
        );
      }

      cursorY += 8;
    }
  }

  doc.save(itineraryFileName(trip));
}

function groupActivitiesByPlace(activities: Itinerary['days'][number]['activities']) {
  const groups = new Map<string, {
    key: string;
    placeName: string;
    activities: Itinerary['days'][number]['activities'];
    bookings: NonNullable<Itinerary['days'][number]['activities'][number]['bookings']>;
  }>();

  for (const activity of activities || []) {
    const placeName = activity.placeName || activity.placeId || 'Activity';
    const key = `${activity.placeId || placeName}::${placeName}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        placeName,
        activities: [],
        bookings: [],
      });
    }

    const group = groups.get(key)!;
    group.activities.push(activity);
    for (const booking of activity.bookings || []) {
      if (!group.bookings.some((item: NonNullable<Itinerary['days'][number]['activities'][number]['bookings']>[number]) => item.id === booking.id)) {
        group.bookings.push(booking);
      }
    }
  }

  return Array.from(groups.values());
}

function updateBookingStatusInTrips(trips: Itinerary[], bookingId: string, status: 'pending' | 'confirmed' | 'cancelled') {
  return trips.map((trip) => ({
    ...trip,
    days: (trip.days || []).map((day: Itinerary['days'][number]) => ({
      ...day,
      activities: (day.activities || []).map((activity: Itinerary['days'][number]['activities'][number]) => ({
        ...activity,
        bookings: (activity.bookings || []).map((booking: NonNullable<Itinerary['days'][number]['activities'][number]['bookings']>[number]) =>
          booking.id === bookingId ? { ...booking, status } : booking,
        ),
      })),
    })),
  }));
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function ItineraryPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = new URLSearchParams(window.location.search);
  const expandTripId = location.get('expandTrip');

  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [allTrips, setAllTrips] = useState<Itinerary[]>([]);
  // Pagination state
  const [page, setPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const PER_PAGE = 6;
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'table'>('grid');

  // create trip modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newTrip, setNewTrip] = useState({ title: '', destination: '', startDate: '', endDate: '' });

  // activity modal
  const [isActModal, setIsActModal] = useState(false);
  const [actTripId, setActTripId] = useState<string | null>(null);
  const [newAct, setNewAct] = useState({ time: '09:00', placeId: '', notes: '' });
  const [editingAct, setEditingAct] = useState<{ dayNumber: number; index: number } | null>(null);
  const [savingAct, setSavingAct] = useState(false);
  const [bookingActionId, setBookingActionId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  /* ── Pagination helper component ── */
  const ResultPageNav = ({
    page,
    total,
    onPrev,
    onNext,
    onSelect,
  }: {
    page: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
    onSelect: (nextPage: number) => void;
  }) => {
    if (total <= 1) return null;

    const pages = Array.from({ length: total }, (_, index) => index + 1);

    return (
      <div className="flex items-center justify-center gap-3 mt-8 mb-10">
        <button onClick={onPrev} disabled={page === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          <ChevronLeft size={15} /> Prev
        </button>

        <div className="flex items-center gap-2">
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => onSelect(pageNumber)}
              className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-semibold transition ${
                pageNumber === page
                  ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button onClick={onNext} disabled={page === total}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
          Next <ChevronRight size={15} />
        </button>
      </div>
    );
  };

  const selectedTrip = itineraries[0] || null;

  // Map query: updates when user clicks a trip card
  const [mapQuery, setMapQuery] = useState<string>('');
  useEffect(() => {
    if (itineraries.length > 0 && !mapQuery) {
      setMapQuery(itineraries[0].destination || '');
    }
    // Auto-expand trip if it was passed as a query parameter
    if (expandTripId && itineraries.some(t => t.id === expandTripId)) {
      setExpandedId(expandTripId);
    }
  }, [itineraries, expandTripId]);

  useEffect(() => {
    // Wait until auth resolves
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const unsub = itineraryService.subscribeToUserItineraries(user.uid, (data: Itinerary[]) => {
      setItineraries(data);
      setLoading(false);
    });
    if (isAdmin) {
      itineraryService.getAllItineraries().then(setAllTrips).catch(console.error);
    }
    return () => unsub();
  }, [user, isAdmin, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setCreateError('');
    try {
      const result = await itineraryService.create({ ...newTrip, userId: user.uid, days: [], status: 'draft' });
      if (result && (result as any).id) {
        setItineraries(prev => {
          const exists = prev.some(t => t.id === (result as any).id);
          if (exists) return prev;
          return [...prev, { ...newTrip, id: (result as any).id, userId: user.uid, days: [], status: 'draft', createdAt: new Date() }];
        });
      }
      setIsModalOpen(false);
      setNewTrip({ title: '', destination: '', startDate: '', endDate: '' });
    } catch (err: any) {
      console.error(err);
      setCreateError('Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trip?')) return;
    await itineraryService.delete(id);
  };

  const openActModal = (tripId: string, editing?: { dayNumber: number; index: number; act: any }) => {
    setActTripId(tripId);
    // Update map to show the trip's destination when modal opens
    const trip = itineraries.find(t => t.id === tripId);
    if (trip?.destination) setMapQuery(trip.destination);
    if (editing) {
      setEditingAct({ dayNumber: editing.dayNumber, index: editing.index });
      setNewAct({ time: editing.act.time || '09:00', placeId: editing.act.placeId || '', notes: editing.act.notes || '' });
    } else {
      setEditingAct(null);
      setNewAct({ time: '09:00', placeId: '', notes: '' });
    }
    setIsActModal(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTripId) return;
    setSavingAct(true);
    try {
      const trip = itineraries.find(t => t.id === actTripId);
      if (!trip) return;
      const days = [...(trip.days || [])];
      let day = days.find(d => d.dayNumber === 1);
      if (!day) { day = { dayNumber: 1, activities: [] }; days.push(day); }
      if (editingAct) {
        day.activities[editingAct.index] = newAct;
      } else {
        day.activities.push(newAct);
      }
      await itineraryService.update(actTripId, { days });
      // Update map to show the specific place after saving
      if (newAct.placeId.trim()) {
        setMapQuery(`${newAct.placeId}, ${trip.destination || ''}`);
      }
      setIsActModal(false);
      setEditingAct(null);
      setNewAct({ time: '09:00', placeId: '', notes: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAct(false);
    }
  };

  const deleteActivity = async (tripId: string, dayNumber: number, index: number) => {
    if (!confirm('Remove this activity?')) return;
    const trip = itineraries.find(t => t.id === tripId);
    if (!trip) return;
    const days = [...trip.days];
    const day = days.find(d => d.dayNumber === dayNumber);
    if (day) {
      day.activities.splice(index, 1);
      await itineraryService.update(tripId, { days });
    }
  };

  const handleTripStatusChange = async (tripId: string, status: Itinerary['status']) => {
    await itineraryService.updateStatus(tripId, status);
    setItineraries(prev => prev.map(t => t.id === tripId ? { ...t, status } : t));
    setAllTrips(prev => prev.map(t => t.id === tripId ? { ...t, status } : t));
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    setBookingActionId(bookingId);
    try {
      await bookingService.updateStatus(bookingId, 'cancelled');
      setItineraries((prev) => updateBookingStatusInTrips(prev, bookingId, 'cancelled'));
      setAllTrips((prev) => updateBookingStatusInTrips(prev, bookingId, 'cancelled'));
    } catch (error) {
      console.error(error);
    } finally {
      setBookingActionId(null);
    }
  };

  const filtered = statusFilter === 'all'
    ? itineraries
    : itineraries.filter(t => t.status === statusFilter);

  // Pagination for user trips
  const pagedTrips = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Pagination for admin trips
  const pagedAdminTrips = allTrips.slice((adminPage - 1) * PER_PAGE, adminPage * PER_PAGE);
  const adminTotalPages = Math.ceil(allTrips.length / PER_PAGE);

  /* ── Stats ── */
  const stats = [
    { label: 'Total Trips', value: itineraries.length, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Upcoming', value: itineraries.filter(t => t.status === 'upcoming').length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Confirmed', value: itineraries.filter(t => t.status === 'confirmed').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Trip Value', value: formatMoney(itineraries.reduce((sum, trip) => sum + tripTotalPrice(trip), 0)), color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-6 pt-28 pb-10">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wider">Trip planner</span>
              <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-black uppercase tracking-wider">AI itinerary</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-3">Where to today?</h1>
            <p className="text-slate-500 text-sm md:text-base max-w-2xl mb-7">
              Build your day-by-day plan with flight ideas, local activities, and smart scheduling in one calm workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setIsModalOpen(true); setCreateError(''); }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition"
              >
                <Plus size={18} /> New Trip
              </button>
              <button
                onClick={() => navigate('/destinations')}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold text-sm transition"
              >
                <Sparkles size={16} /> Explore Places
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              {mapQuery ? `Map · ${mapQuery}` : 'Select a trip to see map'}
            </p>
            {mapQuery ? (
              <iframe
                key={mapQuery}
                title="trip-map"
                width="100%"
                height="180"
                style={{ border: 0, borderRadius: '16px' }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&zoom=11`}
              />
            ) : (
              <div className="w-full h-40 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                <MapPin size={20} className="mr-2" /> Click a trip card to preview map
              </div>
            )}
            {mapQuery && (
              <div className="mt-4">
                <p className="font-black text-slate-900">{mapQuery}</p>
                <p className="text-xs text-slate-500 mt-1">Click any trip card to update the map location.</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-20 md:pb-24">
        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-1 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── ADMIN TABLE ── */}
        {isAdmin && (
          <section className="mb-14">
            <h2 className="text-xl font-bold text-slate-900 mb-6">All User Trips (Admin)</h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['User', 'Destination', 'Dates', 'Status', 'Total', ''].map(h => (
                      <th key={h} className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedAdminTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-slate-800 truncate max-w-[120px]">{trip.userId}</td>
                      <td className="px-5 py-4 text-slate-700">{trip.destination}</td>
                      <td className="px-5 py-4 text-slate-500">{trip.startDate} – {trip.endDate}</td>
                      <td className="px-5 py-4"><StatusBadge status={trip.status} /></td>
                      <td className="px-5 py-4 text-slate-700 font-semibold">{formatMoney(tripTotalPrice(trip), tripCurrency(trip))}</td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => handleDelete(trip.id)} className="text-xs text-rose-500 hover:text-rose-700 font-semibold">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination controls for admin */}
              <ResultPageNav page={adminPage} total={adminTotalPages} onPrev={() => setAdminPage(adminPage - 1)} onNext={() => setAdminPage(adminPage + 1)} onSelect={setAdminPage} />
            </div>
          </section>
        )}

        {/* ── Filter + View toggle ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {['all', 'upcoming', 'confirmed', 'completed', 'draft'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                  statusFilter === s
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                }`}
              >
                {s === 'all' ? 'All trips' : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
            <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition ${view === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('table')} className={`p-2 rounded-lg transition ${view === 'table' ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:text-slate-600'}`}>
              <Table2 size={16} />
            </button>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-72 rounded-3xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && itineraries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Calendar size={52} strokeWidth={1.2} className="text-purple-300" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-700">No trips yet</p>
              <p className="text-sm mt-1">Start by creating your first trip, then add places to visit.</p>
            </div>
            <button
              onClick={() => { setIsModalOpen(true); setCreateError(''); }}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-purple-700 transition mt-2"
            >
              <Plus size={16} /> Create First Trip
            </button>
          </div>
        )}

        {/* ── GRID view ── */}
        {!loading && filtered.length > 0 && view === 'grid' && (
          <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pagedTrips.map((trip, idx) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="self-start flex h-full min-h-[540px] max-h-[760px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl cursor-pointer"
                onClick={() => { setMapQuery(trip.destination || trip.title || ''); }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={destImg(trip.destination)}
                    alt={trip.destination}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3"><StatusBadge status={trip.status} /></div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="text-white font-black text-xl leading-tight truncate">{trip.title || 'Untitled trip'}</p>
                    <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin size={10} />{trip.destination || 'No destination set'}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Trip status</label>
                    <select
                      value={trip.status}
                      onChange={(e) => handleTripStatusChange(trip.id, e.target.value as Itinerary['status'])}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="draft">Draft</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><Calendar size={11} />{trip.startDate || 'TBD'} – {trip.endDate || 'TBD'}</span>
                    <span className="flex items-center gap-1 ml-auto"><Landmark size={11} />{(trip.days || []).reduce((a: number, d: Itinerary['days'][number]) => a + (d.activities?.length || 0), 0)} activities</span>
                  </div>
                  <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Total Trip Price</p>
                    <p className="text-lg font-black text-emerald-700 mt-1">{formatMoney(tripTotalPrice(trip), tripCurrency(trip))}</p>
                  </div>

                  {/* Quick activity preview */}
                  <div className="min-h-[104px] space-y-2">
                    {(trip.days || []).flatMap((d: Itinerary['days'][number]) => d.activities || []).slice(0, 2).map((act: Itinerary['days'][number]['activities'][number], i: number) => {
                      const Icon = actIcon(act.notes);
                      return (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl">
                          <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg shrink-0"><Icon size={12} /></span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{act.placeName || act.placeId || 'Activity'}</p>
                            <p className="text-[10px] text-slate-500">{act.time} · {(act.notes || '').slice(0, 40)}{act.notes?.length > 40 ? '…' : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                    {(trip.days || []).flatMap((d: Itinerary['days'][number]) => d.activities || []).length === 0 && (
                      <div className="flex h-[104px] items-center justify-center rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                        No activities planned yet.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setExpandedId(expandedId === trip.id ? null : trip.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded-xl text-xs font-bold transition"
                    >
                      {expandedId === trip.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedId === trip.id ? 'Less' : 'Details'}
                    </button>
                    <button
                      onClick={() => openActModal(trip.id)}
                      className="flex items-center gap-1.5 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      <Plus size={13} /> Activity
                    </button>
                    <button
                      onClick={() => downloadTripPdf(trip)}
                      title="Download PDF"
                      aria-label={`Download ${trip.title || 'trip'} as PDF`}
                      className="shrink-0 p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="shrink-0 p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {expandedId === trip.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-4 max-h-[280px] overflow-y-auto pr-1">
                          {/* Status changer */}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Status</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(['draft','upcoming','confirmed','completed'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => handleTripStatusChange(trip.id, s)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold capitalize transition ${
                                    trip.status === s
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Full activity list */}
                          {(trip.days || []).map((day: Itinerary['days'][number]) => (
                            <div key={day.dayNumber}>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">Day {day.dayNumber}</p>
                              <div className="space-y-2">
                                {groupActivitiesByPlace(day.activities || []).map((group) => (
                                  <div key={group.key} className="rounded-xl bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                      <div>
                                        <p className="text-xs font-bold text-slate-800">{group.placeName}</p>
                                        <p className="text-[10px] text-slate-500">{group.activities.length} item{group.activities.length === 1 ? '' : 's'} saved</p>
                                      </div>
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Place</span>
                                    </div>

                                    <div className="space-y-2">
                                      {group.activities.map((act: Itinerary['days'][number]['activities'][number], i: number) => {
                                        const Icon = actIcon(act.notes);
                                        const index = day.activities.findIndex((item: Itinerary['days'][number]['activities'][number]) => item === act);
                                        return (
                                          <div key={act.id || `${group.key}-${i}`} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 group">
                                            <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg shrink-0"><Icon size={12} /></span>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[10px] text-slate-500 mt-0.5">{act.time}</p>
                                              {act.notes && <p className="text-[11px] text-slate-600 mt-1">{act.notes}</p>}
                                              <p className="text-[11px] font-semibold text-emerald-600 mt-1">{formatMoney(activityBookedPrice(act), act.currency || tripCurrency(trip))}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                              <button onClick={() => openActModal(trip.id, { dayNumber: day.dayNumber, index, act })}
                                                className="p-1 text-slate-400 hover:text-purple-600"><Edit2 size={12} /></button>
                                              <button onClick={() => deleteActivity(trip.id, day.dayNumber, index)}
                                                className="p-1 text-slate-400 hover:text-rose-500"><Trash2 size={12} /></button>
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {group.bookings.length > 0 && (
                                        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-2">Bookings</p>
                                          <div className="space-y-2">
                                            {group.bookings.map((booking: NonNullable<Itinerary['days'][number]['activities'][number]['bookings']>[number]) => (
                                              <div key={booking.id} className="flex items-start justify-between gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2">
                                                <div>
                                                  <p className="text-xs font-bold text-slate-800">
                                                    {booking.bookingType === 'flight' ? (booking.flightName || booking.hotelName) : booking.hotelName}
                                                  </p>
                                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                                    {booking.checkIn} to {booking.checkOut}{booking.location ? ` · ${booking.location}` : ''}
                                                  </p>
                                                  <p className="mt-1">
                                                    <StatusBadge status={booking.status} />
                                                  </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                  <p className="text-[11px] font-semibold text-sky-700">{formatMoney(booking.totalPrice, booking.currency)}</p>
                                                  {booking.status !== 'cancelled' ? (
                                                    <button
                                                      onClick={() => void handleCancelBooking(booking.id)}
                                                      disabled={bookingActionId === booking.id}
                                                      className="rounded-lg bg-rose-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                      {bookingActionId === booking.id ? 'Cancelling...' : 'Cancel'}
                                                    </button>
                                                  ) : null}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {(!day.activities || day.activities.length === 0) && (
                                  <p className="text-xs text-slate-400 italic">No activities yet.</p>
                                )}
                              </div>
                            </div>
                          ))}

                          {(trip.days || []).length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-xs text-slate-400">No activities planned yet.</p>
                              <button
                                onClick={() => openActModal(trip.id)}
                                className="mt-2 text-xs text-purple-600 font-semibold underline underline-offset-4"
                              >
                                + Add first activity
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => navigate('/destinations')}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-lg transition mt-2"
                          >
                            <Sparkles size={13} /> Explore places to add
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── TABLE view ── */}
        {!loading && filtered.length > 0 && view === 'table' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Trip', 'Destination', 'Dates', 'Activities', 'Total', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedTrips.map(trip => (
                  <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900">{trip.title || 'Untitled'}</td>
                    <td className="px-5 py-4 text-slate-600 flex items-center gap-1.5">
                      <MapPin size={13} className="text-purple-500" />{trip.destination || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{trip.startDate || '—'} – {trip.endDate || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {(trip.days || []).reduce((a: number, d: Itinerary['days'][number]) => a + (d.activities?.length || 0), 0)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700">{formatMoney(tripTotalPrice(trip), tripCurrency(trip))}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <StatusBadge status={trip.status} />
                        <select
                          value={trip.status}
                          onChange={(e) => handleTripStatusChange(trip.id, e.target.value as Itinerary['status'])}
                          className="block w-[130px] px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
                        >
                          <option value="draft">Draft</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openActModal(trip.id)} className="text-xs text-purple-600 font-semibold mr-3">+ Activity</button>
                      <button onClick={() => downloadTripPdf(trip)} className="text-xs text-emerald-600 font-semibold mr-3">Download PDF</button>
                      <button onClick={() => handleDelete(trip.id)} className="text-xs text-rose-500 font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls for user trips */}
        {!loading && filtered.length > 0 && (
          <ResultPageNav page={page} total={totalPages} onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} onSelect={setPage} />
        )}

        {/* ── Map Section (only if trips exist) ── */}
        {!loading && itineraries.length > 0 && (
          <div className="mt-14" id="trip-map">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Map View</p>
                <h2 className="text-xl font-black text-slate-900">
                  Exploring{' '}
                  <span className="text-purple-600">{mapQuery || 'your destination'}</span>
                </h2>
              </div>
              {mapQuery && (
                <button
                  onClick={() => setMapQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition"
                >
                  <X size={12} /> Reset map
                </button>
              )}
            </div>
            <div className="relative h-80 md:h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
              {mapQuery ? (
                <iframe
                  key={mapQuery}
                  width="100%" height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&zoom=13`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 gap-2">
                  <MapPin size={24} strokeWidth={1.5} className="text-purple-300" />
                  <span className="text-sm">Click a trip card or add an activity to preview the map</span>
                </div>
              )}
              {mapQuery && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg flex items-center gap-1.5">
                  <MapPin size={14} className="text-purple-500" />
                  {mapQuery}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ ACTIVITY MODAL ══════════════════════════════════ */}
      <AnimatePresence>
        {isActModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsActModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <button onClick={() => setIsActModal(false)} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
                <X size={18} />
              </button>
              <h2 className="text-xl font-black text-slate-900 mb-6">{editingAct ? 'Edit Activity' : 'Add Activity'}</h2>
              <form onSubmit={handleSaveActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Time</label>
                  <input type="time" required value={newAct.time}
                    onChange={e => setNewAct({...newAct, time: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Place / Activity Name</label>
                  <input type="text" required value={newAct.placeId}
                    onChange={e => setNewAct({...newAct, placeId: e.target.value})}
                    placeholder="e.g. Eiffel Tower, Ramen lunch, Hotel check-in"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Notes (optional)</label>
                  <textarea value={newAct.notes}
                    onChange={e => setNewAct({...newAct, notes: e.target.value})}
                    placeholder="Tickets booked, meeting point, dress code…"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsActModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingAct}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-60 transition">
                    {savingAct ? 'Saving…' : editingAct ? 'Save Changes' : 'Add Activity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ CREATE TRIP MODAL ═══════════════════════════════ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
                <X size={18} />
              </button>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-1">New trip</p>
                <h2 className="text-2xl font-black text-slate-900">Plan your next adventure</h2>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Trip Title</label>
                  <input type="text" required value={newTrip.title}
                    onChange={e => setNewTrip({...newTrip, title: e.target.value})}
                    placeholder="Summer in Japan"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Destination</label>
                  <input type="text" required value={newTrip.destination}
                    onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                    placeholder="Tokyo, Japan"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Start Date</label>
                    <input type="date" required value={newTrip.startDate}
                      onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">End Date</label>
                    <input type="date" required value={newTrip.endDate}
                      onChange={e => setNewTrip({...newTrip, endDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  </div>
                </div>
                {createError && (
                  <p className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <AlertCircle size={13} />{createError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-60 hover:shadow-lg hover:shadow-purple-500/25 transition">
                    {creating ? 'Creating…' : 'Create Trip'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
