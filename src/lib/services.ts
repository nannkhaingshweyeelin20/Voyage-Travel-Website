import { ApiError, apiFetch } from './api';
import { resolvePlaceImage } from './images';

export interface Destination {
  id: string;
  name: string;
  type: 'hotel' | 'restaurant' | 'attraction';
  description: string;
  location: string;
  imageUrl: string;
  priceRange: string;
  rating: number;
}

export interface Activity {
  id?: string;
  time: string;
  placeId: string;
  placeName?: string;
  notes: string;
  imageUrl?: string;
  location?: string;
  price?: number;
  currency?: string;
  bookings?: Array<{
    id: string;
    placeId?: string;
    placeName?: string;
    bookingType: 'hotel' | 'flight' | 'restaurant';
    flightName?: string;
    hotelName: string;
    location?: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    totalPrice: number;
    currency: string;
  }>;
}

export interface Day {
  dayNumber: number;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: Day[];
  status: 'draft' | 'confirmed' | 'upcoming' | 'completed';
  notes?: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  phone?: string;
  profileImage?: string | null;
  createdAt: any;
}

export interface Booking {
  id: string;
  userId: string;
  itineraryId?: string;
  placeId?: string;
  placeName?: string;
  bookingType?: 'hotel' | 'flight' | 'restaurant';
  flightName?: string;
  hotelName: string;
  location?: string;
  imageUrl?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  flightDetails?: {
    airline: string;
    flightNumber: string;
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    departTime: string;
    arriveTime: string;
    duration: string;
  };
  status: 'pending' | 'confirmed' | 'cancelled';
  totalPrice: number;
  currency: string;
  createdAt: string;
}

export interface BookingWithTripInput extends Omit<Booking, 'id' | 'createdAt'> {
  destination: string;
  tripTitle?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: string;
  destination: string;
  startDate: string;
  endDate: string;
  message: string;
  status: 'new' | 'replied' | 'open' | 'pending' | 'resolved';
  reply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  title: string;
  city: string;
  country: string;
  imageUrl: string;
  price: number;
  currency: string;
  rating: number;
  propertyType: string;
  notes?: string;
  savedAt: string;
}

export interface BlogPost {
  id: string;
  userId: string;
  authorName: string;
  authorProfileImage?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string[];
  status: 'pending' | 'approved';
  createdAt: string;
  updatedAt: string;
}

const normalizeUploadedImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
};

const mapApiBlogPost = (item: any): BlogPost => ({
  id: String(item.id),
  userId: String(item.userId || item.user_id || ''),
  authorName: String(item.authorName || item.author_name || ''),
  authorProfileImage: item.authorProfileImage || item.author_profile_image || undefined,
  title: String(item.title || ''),
  slug: String(item.slug || ''),
  excerpt: String(item.excerpt || ''),
  content: String(item.content || ''),
  coverImage: normalizeUploadedImageUrl(item.coverImage || item.cover_image),
  tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : [],
  status: (item.status || 'pending') as BlogPost['status'],
  createdAt: String(item.createdAt || item.created_at || ''),
  updatedAt: String(item.updatedAt || item.updated_at || ''),
});

async function uploadImageFile(path: string, file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Could not read the selected image.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });

  const response = await apiFetch<{ imageUrl: string }>(path, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      data,
    }),
  });

  return normalizeUploadedImageUrl(response.imageUrl) || response.imageUrl;
}

const ITINERARY_CHANGED_EVENT = 'voyage:itinerary-changed';

export function notifyItineraryChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ITINERARY_CHANGED_EVENT));
  }
}

const mapApiBooking = (item: any): Booking => ({
  id: String(item.id),
  userId: String(item.userId || item.user_id || ''),
  itineraryId: item.itineraryId || item.itinerary_id ? String(item.itineraryId || item.itinerary_id) : undefined,
  placeId: item.placeId || item.place_id ? String(item.placeId || item.place_id) : undefined,
  placeName: item.placeName ? String(item.placeName) : item.place_name ? String(item.place_name) : undefined,
  bookingType: (item.bookingType || item.booking_type || 'hotel') as Booking['bookingType'],
  flightName: item.flightName ? String(item.flightName) : item.flight_name ? String(item.flight_name) : undefined,
  hotelName: String(item.hotelName || item.hotel_name || 'Booking'),
  location: item.location ? String(item.location) : undefined,
  imageUrl: item.imageUrl ? String(item.imageUrl) : item.image_url ? String(item.image_url) : undefined,
  checkIn: String(item.checkIn || item.check_in || ''),
  checkOut: String(item.checkOut || item.check_out || ''),
  guests: Number(item.guests || 1),
  flightDetails: item.flightDetails || item.flight_details || undefined,
  status: (item.status || 'confirmed') as Booking['status'],
  totalPrice: Number(item.totalPrice ?? item.total_price ?? 0),
  currency: String(item.currency || 'USD'),
  createdAt: String(item.createdAt || item.created_at || new Date().toISOString()),
});

const mapApiItinerary = (item: any): Itinerary => ({
  id: String(item.id),
  userId: String(item.userId || item.user_id || ''),
  userName: item.userName ? String(item.userName) : item.user_name ? String(item.user_name) : undefined,
  userEmail: item.userEmail ? String(item.userEmail) : item.user_email ? String(item.user_email) : undefined,
  title: String(item.title || ''),
  destination: String(item.destination || ''),
  startDate: String(item.startDate || item.start_date || ''),
  endDate: String(item.endDate || item.end_date || ''),
  status: (item.status || 'draft') as Itinerary['status'],
  notes: item.notes,
  createdAt: item.createdAt || item.created_at,
  days: Array.isArray(item.days)
    ? item.days.map((day: any) => ({
        dayNumber: Number(day.dayNumber || day.day_number || 1),
        activities: Array.isArray(day.activities)
          ? day.activities.map((activity: any) => ({
              id: activity.id ? String(activity.id) : undefined,
              time: String(activity.time || '09:00'),
              placeId: String(activity.placeId || activity.place_id || ''),
              placeName: activity.placeName ? String(activity.placeName) : activity.place_name ? String(activity.place_name) : undefined,
              notes: String(activity.notes || ''),
              imageUrl: activity.imageUrl || activity.image_url,
              location: activity.location,
              price: typeof activity.price === 'number' ? activity.price : activity.price != null ? Number(activity.price) : undefined,
              currency: activity.currency ? String(activity.currency) : undefined,
              bookings: Array.isArray(activity.bookings)
                ? activity.bookings.map((booking: any) => ({
                    id: String(booking.id),
                    placeId: booking.placeId ? String(booking.placeId) : booking.place_id ? String(booking.place_id) : undefined,
                    placeName: booking.placeName ? String(booking.placeName) : booking.place_name ? String(booking.place_name) : undefined,
                    bookingType: (booking.bookingType || booking.booking_type || 'hotel') as Booking['bookingType'],
                    flightName: booking.flightName ? String(booking.flightName) : booking.flight_name ? String(booking.flight_name) : undefined,
                    hotelName: String(booking.hotelName || booking.hotel_name || 'Booking'),
                    location: booking.location ? String(booking.location) : undefined,
                    checkIn: String(booking.checkIn || booking.check_in || ''),
                    checkOut: String(booking.checkOut || booking.check_out || ''),
                    guests: Number(booking.guests || 1),
                    status: (booking.status || 'confirmed') as Booking['status'],
                    totalPrice: Number(booking.totalPrice ?? booking.total_price ?? 0),
                    currency: String(booking.currency || 'USD'),
                  }))
                : undefined,
            }))
          : [],
      }))
    : [],
});

const normalizeDestinationImageUrl = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      // Keep external images (e.g. unsplash) untouched.
      if (!parsed.pathname.startsWith('/uploads/')) {
        return trimmed;
      }

      // Keep uploaded app images on the local /uploads path so Vite/public can serve them.
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return trimmed;
    }
  }

  return trimmed;
};

const mapApiDestination = (item: any): Destination => ({
  id: String(item.id),
  name: String(item.name || ''),
  type: (item.type || 'attraction') as Destination['type'],
  description: String(item.description || ''),
  location: String(item.location || ''),
  imageUrl: normalizeDestinationImageUrl(item.imageUrl || item.image_url),
  priceRange: String(item.priceRange || item.price_range || ''),
  rating: Number(item.rating ?? 4.5),
});

const normalizeMessageStatus = (status?: ContactMessage['status']): 'new' | 'replied' => {
  if (status === 'replied' || status === 'resolved') return 'replied';
  return 'new';
};
  notifyItineraryChanged();

export const destinationService = {
  async getAll(): Promise<Destination[]> {
    const response = await apiFetch<{ destinations: any[] }>('/api/destinations');
    return Array.isArray(response.destinations) ? response.destinations.map(mapApiDestination) : [];
  },
  async getLatest(options?: { limit?: number; type?: Destination['type'] }): Promise<Destination[]> {
    const params = new URLSearchParams();
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options?.type) {
      params.set('type', options.type);
    }
    const query = params.toString();
    const response = await apiFetch<{ destinations: any[] }>(`/api/destinations/latest${query ? `?${query}` : ''}`);
    return Array.isArray(response.destinations) ? response.destinations.map(mapApiDestination) : [];
  },
  async search(options?: { query?: string; limit?: number; type?: Destination['type'] }): Promise<Destination[]> {
    const params = new URLSearchParams();
    if (options?.query) {
      params.set('q', options.query);
    }
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (options?.type) {
      params.set('type', options.type);
    }
    const query = params.toString();
    const response = await apiFetch<{ destinations: any[] }>(`/api/destinations/search${query ? `?${query}` : ''}`);
    return Array.isArray(response.destinations) ? response.destinations.map(mapApiDestination) : [];
  },
  async create(data: Omit<Destination, 'id'>) {
    const response = await apiFetch<{ destination: any }>('/api/destinations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapApiDestination(response.destination);
  },
  async uploadImage(file: File) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        if (!base64) {
          reject(new Error('Could not read the selected image.'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    });

    const response = await apiFetch<{ imageUrl: string }>('/api/uploads/destination-image', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        data,
      }),
    });

    return response.imageUrl;
  },
  async update(id: string, data: Partial<Destination>) {
    const response = await apiFetch<{ destination: any }>(`/api/destinations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.destination ? mapApiDestination(response.destination) : undefined;
  },
  async delete(id: string) {
    await apiFetch(`/api/destinations/${id}`, {
      method: 'DELETE',
    });
  }
};

export const itineraryService = {
  subscribeToUserItineraries(_userId: string, callback: (itineraries: Itinerary[]) => void) {
    let active = true;

    const load = async () => {
      try {
        const response = await apiFetch<{ itineraries: any[] }>('/api/itineraries/mine');
        if (active) {
          callback(response.itineraries.map(mapApiItinerary));
        }
      } catch {
        if (active) {
          callback([]);
        }
      }
    };

    void load();

    const onChanged = () => {
      void load();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(ITINERARY_CHANGED_EVENT, onChanged);
    }

    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(ITINERARY_CHANGED_EVENT, onChanged);
      }
    };
  },
  async create(data: Omit<Itinerary, 'id' | 'createdAt'>) {
    const response = await apiFetch<{ itineraryId: string; itinerary?: any }>('/api/itinerary/create', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
      }),
    });

    notifyItineraryChanged();

    if (response.itinerary) {
      return mapApiItinerary(response.itinerary);
    }

    return {
      ...data,
      id: String(response.itineraryId),
      createdAt: new Date().toISOString(),
    } as Itinerary;
  },
  async update(id: string, data: Partial<Itinerary>) {
    await apiFetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: data.title,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        days: data.days,
      }),
    });
    notifyItineraryChanged();
  },
  async delete(id: string) {
    try {
      await apiFetch(`/api/itineraries/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        await apiFetch(`/api/admin/itineraries/${id}`, { method: 'DELETE' });
      } else {
        throw error;
      }
    }
    notifyItineraryChanged();
  },
  async getByUser(_userId: string): Promise<Itinerary[]> {
    const response = await apiFetch<{ itineraries: any[] }>('/api/itineraries/mine');
    return response.itineraries.map(mapApiItinerary);
  },
  async getAllItineraries(): Promise<Itinerary[]> {
    const response = await apiFetch<{ itineraries: any[] }>('/api/itineraries');
    return response.itineraries.map(mapApiItinerary);
  },
  async addItem(id: string, item: any) {
    await apiFetch('/api/itinerary/add-item', {
      method: 'POST',
      body: JSON.stringify({
        itineraryId: id,
        placeName: item.placeName || item.notes?.split(' — ')[0]?.replace(/^\p{Emoji_Presentation}\s*/u, '') || item.placeId || 'Saved place',
        dayNumber: 1,
        timeSlot: item.time || '09:00',
        notes: item.notes || '',
        place: {
          externalId: item.placeId,
          name: item.placeName || item.notes?.split(' — ')[0]?.replace(/^\p{Emoji_Presentation}\s*/u, '') || item.placeId || 'Saved place',
          type: item.type || 'place',
          location: item.location || undefined,
          imageUrl: item.imageUrl || undefined,
          price: typeof item.price === 'number' ? item.price : undefined,
          currency: item.currency || undefined,
        },
      }),
    });
    notifyItineraryChanged();
  },
  async updateStatus(id: string, status: Itinerary['status']) {
    await apiFetch(`/api/itineraries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    notifyItineraryChanged();
  }
};

export const userService = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const response = await apiFetch<{ user: UserProfile }>('/api/users/me');
    return response.user.uid === uid ? response.user : null;
  },
  async getAllUsers(): Promise<UserProfile[]> {
    const response = await apiFetch<{ users: UserProfile[] }>('/api/admin/users');
    return response.users;
  },
  async deleteUser(uid: string) {
    await apiFetch(`/api/admin/users/${uid}`, {
      method: 'DELETE',
    });
  },
  async updateProfile(data: { name: string; email: string; phone?: string; profileImage?: string }) {
    const response = await apiFetch<{ message: string; user: UserProfile }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }
};

export const bookingService = {
  async create(data: Omit<Booking, 'id' | 'createdAt' | 'userId'>): Promise<Booking> {
    const response = await apiFetch<{ booking: Booking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    notifyItineraryChanged();
    return mapApiBooking(response.booking);
  },
  async createWithTrip(data: BookingWithTripInput): Promise<{ booking: Booking; itinerary?: Itinerary; itineraryId?: string }> {
    const response = await apiFetch<{ booking: Booking; itinerary?: Itinerary; itineraryId?: string }>('/api/bookings/create-with-trip', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    notifyItineraryChanged();

    return {
      booking: mapApiBooking(response.booking),
      itinerary: response.itinerary ? mapApiItinerary(response.itinerary) : undefined,
      itineraryId: response.itineraryId ? String(response.itineraryId) : undefined,
    };
  },
  async getAll(): Promise<Booking[]> {
    const response = await apiFetch<{ bookings: Booking[] }>('/api/bookings');
    return response.bookings.map(mapApiBooking);
  },
  async updateStatus(id: string, status: Booking['status']) {
    await apiFetch(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    notifyItineraryChanged();
  }
};

export const getDynamicImage = (type: string, name: string) => {
  return resolvePlaceImage({ name, type }, 0);
};

export const messageService = {
  async getAll(): Promise<ContactMessage[]> {
    try {
      const response = await apiFetch<{ messages: ContactMessage[] }>('/api/contact/messages');
      return response.messages.map((msg) => ({ ...msg, status: normalizeMessageStatus(msg.status) }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return [];
      }
      throw error;
    }
  },
  async getMine(): Promise<ContactMessage[]> {
    try {
      const response = await apiFetch<{ messages: ContactMessage[] }>('/api/contact/messages/mine');
      return response.messages.map((msg) => ({ ...msg, status: normalizeMessageStatus(msg.status) }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return [];
      }
      throw error;
    }
  },
  async create(data: Omit<ContactMessage, 'id' | 'status' | 'createdAt'>): Promise<ContactMessage> {
    const response = await apiFetch<{ message: ContactMessage }>('/api/contact/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ...response.message, status: normalizeMessageStatus(response.message.status) };
  },
  async updateStatus(id: string, status: ContactMessage['status']): Promise<void> {
    await apiFetch(`/api/contact/messages/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: normalizeMessageStatus(status) }),
    });
  },
  async reply(id: string, reply: string): Promise<void> {
    await apiFetch(`/api/contact/messages/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  },
  async delete(id: string): Promise<void> {
    await apiFetch(`/api/contact/messages/${id}`, {
      method: 'DELETE',
    });
  },
};

export const favoritesService = {
  async getAll(): Promise<FavoriteItem[]> {
    try {
      const response = await apiFetch<{ favorites: FavoriteItem[] }>('/api/favorites');
      return response.favorites;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return [];
      }
      throw error;
    }
  },
  async save(item: Omit<FavoriteItem, 'savedAt'>): Promise<void> {
    try {
      await apiFetch('/api/favorites', {
        method: 'POST',
        body: JSON.stringify(item),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      throw error;
    }
  },
  async remove(id: string): Promise<void> {
    try {
      await apiFetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return;
      }
      throw error;
    }
  },
};

export const blogService = {
  async listApproved(): Promise<BlogPost[]> {
    const response = await apiFetch<{ posts: BlogPost[] }>('/api/blogs');
    return response.posts.map(mapApiBlogPost);
  },
  async listMine(): Promise<BlogPost[]> {
    const response = await apiFetch<{ posts: BlogPost[] }>('/api/blog/posts/mine');
    return response.posts.map(mapApiBlogPost);
  },
  async listForAdmin(): Promise<BlogPost[]> {
    const response = await apiFetch<{ posts: BlogPost[] }>('/api/blog/posts/admin');
    return response.posts.map(mapApiBlogPost);
  },
  async getBySlug(slug: string): Promise<BlogPost> {
    const response = await apiFetch<{ post: BlogPost }>(`/api/blog/posts/${slug}`);
    return mapApiBlogPost(response.post);
  },
  async uploadCoverImage(file: File) {
    return uploadImageFile('/api/uploads/blog-image', file);
  },
  async create(data: {
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string;
    tags?: string[];
  }): Promise<BlogPost> {
    const response = await apiFetch<{ post: BlogPost }>('/api/blog/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapApiBlogPost(response.post);
  },
  async update(id: string, data: {
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string;
    tags?: string[];
  }): Promise<BlogPost> {
    const response = await apiFetch<{ post: BlogPost }>(`/api/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return mapApiBlogPost(response.post);
  },
  async approve(id: string): Promise<void> {
    await apiFetch(`/api/blog/posts/${id}/approve`, { method: 'PATCH' });
  },
  async remove(id: string): Promise<void> {
    await apiFetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
  },
};
