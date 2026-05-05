import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, ApiError } from './api';
import { notifyItineraryChanged, UserProfile } from './services';

interface AuthUser {
  uid: string;
  email: string;
}

type LegacyTripActivity = {
  time?: string;
  placeId?: string;
  placeName?: string;
  notes?: string;
  imageUrl?: string;
  location?: string;
  price?: number;
  currency?: string;
};

type LegacyTripDay = {
  dayNumber?: number;
  activities?: LegacyTripActivity[];
};

type LegacyTrip = {
  userId?: string;
  uid?: string;
  email?: string;
  title?: string;
  destination?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  days?: LegacyTripDay[];
};

type LegacyTripContainer = {
  itineraries?: unknown[];
  trips?: unknown[];
  items?: unknown[];
  data?: unknown[];
};

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type MeResponse = {
  user: {
    uid: string;
    email: string;
    displayName: string;
    role: 'user' | 'admin';
    phone: string | null;
    profileImage: string | null;
    createdAt: string;
  };
};

function mapProfile(user: MeResponse['user']): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    phone: user.phone ?? undefined,
    profileImage: user.profileImage,
    createdAt: user.createdAt,
  };
}

function normalizeDateOnly(value?: string) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function buildTripSignature(input: { title: string; destination: string; startDate: string; endDate: string }) {
  return [input.title, input.destination, input.startDate, input.endDate]
    .map((part) => part.trim().toLowerCase())
    .join('||');
}

function sanitizeLegacyActivity(activity: LegacyTripActivity) {
  const placeName = activity.placeName?.trim() || activity.notes?.trim() || activity.placeId?.trim() || 'Saved place';
  const imageUrl = activity.imageUrl?.trim();

  return {
    timeSlot: activity.time?.trim() || '09:00',
    notes: activity.notes?.trim() || '',
    placeName,
    place: {
      externalId: activity.placeId?.trim() || undefined,
      name: placeName,
      type: 'place' as const,
      location: activity.location?.trim() || undefined,
      imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined,
      price: typeof activity.price === 'number' && Number.isFinite(activity.price) ? activity.price : undefined,
      currency: activity.currency?.trim() || undefined,
    },
  };
}

function looksLikeLegacyTrip(value: unknown): value is LegacyTrip {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const trip = value as LegacyTrip;
  return Boolean(
    trip.title ||
    trip.destination ||
    trip.startDate ||
    trip.start_date ||
    trip.endDate ||
    trip.end_date ||
    Array.isArray(trip.days),
  );
}

function extractTripsFromValue(value: unknown): LegacyTrip[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTripsFromValue(item));
  }

  if (looksLikeLegacyTrip(value)) {
    return [value];
  }

  if (typeof value !== 'object') {
    return [];
  }

  const container = value as LegacyTripContainer;
  const collected = [
    ...(Array.isArray(container.itineraries) ? extractTripsFromValue(container.itineraries) : []),
    ...(Array.isArray(container.trips) ? extractTripsFromValue(container.trips) : []),
    ...(Array.isArray(container.items) ? extractTripsFromValue(container.items) : []),
    ...(Array.isArray(container.data) ? extractTripsFromValue(container.data) : []),
  ];

  return collected;
}

function normalizeLegacyTrip(trip: LegacyTrip) {
  const normalized = {
    title: trip.title?.trim() || '',
    destination: trip.destination?.trim() || '',
    startDate: normalizeDateOnly(trip.startDate || trip.start_date),
    endDate: normalizeDateOnly(trip.endDate || trip.end_date),
  };

  if (!normalized.title || !normalized.destination || !normalized.startDate || !normalized.endDate) {
    return null;
  }

  return normalized;
}

function extractLegacyTrips(currentUser: AuthUser) {
  if (typeof window === 'undefined') {
    return [] as LegacyTrip[];
  }

  const keys = Object.keys(window.localStorage).filter((key) =>
    /(itinerar|trip)/i.test(key) || key.startsWith('voyage_'),
  );

  const trips: LegacyTrip[] = [];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as unknown;
      const collection = extractTripsFromValue(parsed);

      for (const item of collection) {
        const trip = item as LegacyTrip;
        const owner = (trip.userId || trip.uid || trip.email || '').trim().toLowerCase();
        if (owner && owner !== currentUser.uid.toLowerCase() && owner !== currentUser.email.toLowerCase()) {
          continue;
        }
        trips.push(trip);
      }
    } catch {
      continue;
    }
  }

  return trips;
}

async function migrateLegacyTrips(currentUser: AuthUser) {
  if (typeof window === 'undefined') {
    return;
  }

  const legacyTrips = extractLegacyTrips(currentUser);
  if (legacyTrips.length === 0) {
    return;
  }

  const existing = await apiFetch<{ itineraries: Array<{ title: string; destination: string; startDate: string; endDate: string }> }>('/api/itineraries/mine');
  const seen = new Set(existing.itineraries.map((trip) => buildTripSignature(trip)));
  const migrated = new Set<string>();

  for (const legacyTrip of legacyTrips) {
    const normalizedTrip = normalizeLegacyTrip(legacyTrip);
    if (!normalizedTrip) {
      continue;
    }

    const signature = buildTripSignature(normalizedTrip);
    if (seen.has(signature) || migrated.has(signature)) {
      continue;
    }

    const created = await apiFetch<{ itineraryId: string }>('/api/itinerary/create', {
      method: 'POST',
      body: JSON.stringify(normalizedTrip),
    });

    seen.add(signature);
    migrated.add(signature);

    const days = Array.isArray(legacyTrip.days) ? legacyTrip.days : [];
    for (const day of days) {
      const dayNumber = Number(day.dayNumber || 1);
      const activities = Array.isArray(day.activities) ? day.activities : [];

      for (const activity of activities) {
        const payload = sanitizeLegacyActivity(activity);
        await apiFetch('/api/itinerary/add-item', {
          method: 'POST',
          body: JSON.stringify({
            itineraryId: created.itineraryId,
            dayNumber: Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : 1,
            ...payload,
          }),
        });
      }
    }
  }
  notifyItineraryChanged();
}

async function tryMigrateLegacyTrips(currentUser: AuthUser) {
  try {
    await migrateLegacyTrips(currentUser);
  } catch (error) {
    console.warn('Legacy trip migration skipped after auth success.', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const response = await apiFetch<MeResponse>('/api/auth/me');
      setUser({ uid: response.user.uid, email: response.user.email });
      setProfile(mapProfile(response.user));
      await tryMigrateLegacyTrips({ uid: response.user.uid, email: response.user.email });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        setProfile(null);
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshProfile();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (email: string, pass: string) => {
    const response = await apiFetch<MeResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    setUser({ uid: response.user.uid, email: response.user.email });
    setProfile(mapProfile(response.user));
    await tryMigrateLegacyTrips({ uid: response.user.uid, email: response.user.email });
  };

  const register = async (name: string, email: string, pass: string) => {
    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass }),
    });

    await login(email, pass);
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        throw error;
      }
    } finally {
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
