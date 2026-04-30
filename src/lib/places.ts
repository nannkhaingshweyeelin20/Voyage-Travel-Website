/**
 * Google Places API service — uses the Maps JavaScript API (already loaded in index.html)
 * Falls back to descriptive Unsplash images if no Google photo is available.
 */

import { resolvePlaceImage } from './images';
import { apiFetch } from './api';

/* ── wait for Maps JS to be ready ──────────────────────── */
function waitForMaps(ms = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) { resolve(); return; }
    const start = Date.now();
    const timer = setInterval(() => {
      if ((window as any).google?.maps?.places) { clearInterval(timer); resolve(); }
      else if (Date.now() - start > ms) { clearInterval(timer); reject(new Error('Google Maps not loaded')); }
    }, 150);
  });
}

/* ── get a usable photo URL from Place result ───────────── */
function getPhoto(photos: google.maps.places.PlacePhoto[] | undefined): string {
  if (photos?.[0]) {
    try { return photos[0].getUrl({ maxWidth: 800, maxHeight: 600 }); } catch { /* ignore */ }
  }
  return '';
}

const HOTEL_FALLBACKS = [
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=800&q=80',
];
const REST_FALLBACKS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?auto=format&fit=crop&w=800&q=80',
];
const ATTR_FALLBACKS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
];

/* ── promisified text search ────────────────────────────── */
async function textSearch(query: string): Promise<google.maps.places.PlaceResult[]> {
  await waitForMaps();
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve) => {
    service.textSearch({ query }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) resolve(results);
      else resolve([]);
    });
  });
}

function priceLevelStr(level: number | undefined): string {
  return '$'.repeat(Math.max(1, level ?? 2));
}

/* ── exported interfaces (match existing gemini.ts) ────── */
export interface PlacesHotelResult {
  id: string; name: string; address: string; rating: number;
  pricePerNight: number; currency: string; stars: number;
  photoUrl: string; image: string; imageKeyword: string; location: string; type: 'hotel'; amenities: string[];
}
export interface PlacesRestaurantResult {
  id: string; name: string; cuisine: string; address: string;
  rating: number; priceRange: string; photoUrl: string; image: string;
  imageKeyword: string; location: string; type: 'restaurant'; openHours: string; openNow?: boolean;
}
export interface PlacesAttractionResult {
  id: string; name: string; description: string; location: string;
  category: string; photoUrl: string; image: string; imageKeyword: string; type: 'attraction';
  entryFee: string; duration: string; rating: number;
}

type SerpLocalPlaceResponse = {
  places: Array<{
    id: string;
    name: string;
    address: string;
    rating: number;
    reviewCount: number;
    priceText: string;
    description: string;
    image: string;
    type: string;
  }>;
};

const PRICE_POINTS = [89, 120, 150, 175, 200, 240, 280, 320, 380, 420, 160, 195];

export const googlePlacesService = {
  async searchHotels(destination: string): Promise<PlacesHotelResult[]> {
    const results = await textSearch(`hotels in ${destination}`);
    return results.slice(0, 12).map((p, i) => {
      const name = p.name || 'Hotel';
      const address = p.formatted_address || p.vicinity || destination;
      const photoUrl = getPhoto(p.photos) || HOTEL_FALLBACKS[i % HOTEL_FALLBACKS.length];
      return {
        id: p.place_id || String(i),
        name,
        address,
        location: address,
        type: 'hotel',
        rating: p.rating ?? 4.0,
        pricePerNight: PRICE_POINTS[i % PRICE_POINTS.length],
        currency: 'USD',
        stars: Math.min(5, Math.max(3, Math.round(p.rating ?? 4))),
        photoUrl,
        image: resolvePlaceImage({ name, image: photoUrl, location: address, type: 'hotel', photos: p.photos }, i),
        imageKeyword: p.name || destination || 'luxury hotel',
        amenities: ['Free WiFi', 'Swimming Pool', 'Breakfast', 'Parking', 'Fitness Centre', 'Spa'].slice(0, 3 + (i % 3)),
      };
    });
  },

  async searchRestaurants(destination: string): Promise<PlacesRestaurantResult[]> {
    const results = await textSearch(`restaurants in ${destination}`);
    return results.slice(0, 12).map((p, i) => {
      const types = (p.types || []).filter(t => !['food', 'point_of_interest', 'establishment'].includes(t));
      const cuisineLabel = types[0]?.replace(/_/g, ' ') ?? 'Restaurant';
      const name = p.name || 'Restaurant';
      const address = p.formatted_address || p.vicinity || destination;
      const photoUrl = getPhoto(p.photos) || REST_FALLBACKS[i % REST_FALLBACKS.length];
      return {
        id: p.place_id || String(i),
        name,
        cuisine: cuisineLabel.charAt(0).toUpperCase() + cuisineLabel.slice(1),
        address,
        location: address,
        type: 'restaurant',
        rating: p.rating ?? 4.0,
        priceRange: priceLevelStr(p.price_level),
        photoUrl,
        image: resolvePlaceImage({ name, image: photoUrl, location: address, type: 'restaurant', photos: p.photos }, i),
        imageKeyword: p.name || destination || 'restaurant',
        openHours: p.opening_hours?.open_now !== undefined
          ? (p.opening_hours.open_now ? '🟢 Open now' : '🔴 Closed now')
          : '10:00 AM – 10:00 PM',
        openNow: p.opening_hours?.open_now,
      };
    });
  },

  async searchAttractions(destination: string): Promise<PlacesAttractionResult[]> {
    const results = await textSearch(`tourist attractions sightseeing in ${destination}`);
    return results.slice(0, 12).map((p, i) => {
      const types = (p.types || []).filter(t => !['point_of_interest', 'establishment'].includes(t));
      const catLabel = types[0]?.replace(/_/g, ' ') ?? 'Attraction';
      const name = p.name || 'Attraction';
      const location = p.vicinity || p.formatted_address || destination;
      const photoUrl = getPhoto(p.photos) || ATTR_FALLBACKS[i % ATTR_FALLBACKS.length];
      return {
        id: p.place_id || String(i),
        name,
        description: p.formatted_address || destination,
        location,
        type: 'attraction',
        category: catLabel.charAt(0).toUpperCase() + catLabel.slice(1),
        photoUrl,
        image: resolvePlaceImage({ name, image: photoUrl, location, type: 'attraction', category: catLabel, photos: p.photos }, i),
        imageKeyword: p.name || destination || 'attraction',
        entryFee: i % 4 === 0 ? 'Free' : `$${5 + (i % 5) * 5}`,
        duration: `${1 + (i % 3)}–${2 + (i % 3)} hours`,
        rating: p.rating ?? 4.0,
      };
    });
  },
};

function priceLevelFromText(priceText: string) {
  const dollars = priceText.match(/\$/g)?.length ?? 0;
  return '$'.repeat(Math.max(1, Math.min(dollars || 2, 4)));
}

function nightlyPriceFromText(priceText: string, seed: number) {
  const matches = priceText.match(/\d+/g)?.map(Number) || [];
  if (matches.length >= 2) {
    return Math.round((matches[0] + matches[1]) / 2);
  }
  if (matches.length === 1) {
    return matches[0];
  }
  return PRICE_POINTS[seed % PRICE_POINTS.length];
}

export const serpApiPlacesService = {
  async searchHotels(destination: string): Promise<PlacesHotelResult[]> {
    const response = await apiFetch<SerpLocalPlaceResponse>('/api/places/search', {
      method: 'POST',
      body: JSON.stringify({ destination, category: 'hotels' }),
    });

    return response.places.map((place, index) => ({
      id: place.id,
      name: place.name,
      address: place.address,
      location: place.address,
      type: 'hotel',
      rating: place.rating || 4,
      pricePerNight: nightlyPriceFromText(place.priceText, index),
      currency: 'USD',
      stars: Math.min(5, Math.max(3, Math.round(place.rating || 4))),
      photoUrl: place.image,
      image: resolvePlaceImage({ name: place.name, image: place.image, location: place.address, type: 'hotel' }, index),
      imageKeyword: place.name || destination,
      amenities: ['Free WiFi', 'Breakfast', 'Parking', 'Pool', 'Fitness Centre'].slice(0, 3 + (index % 2)),
    }));
  },

  async searchRestaurants(destination: string): Promise<PlacesRestaurantResult[]> {
    const response = await apiFetch<SerpLocalPlaceResponse>('/api/places/search', {
      method: 'POST',
      body: JSON.stringify({ destination, category: 'restaurants' }),
    });

    return response.places.map((place, index) => ({
      id: place.id,
      name: place.name,
      cuisine: place.type || 'Restaurant',
      address: place.address,
      location: place.address,
      type: 'restaurant',
      rating: place.rating || 4,
      priceRange: priceLevelFromText(place.priceText),
      photoUrl: place.image,
      image: resolvePlaceImage({ name: place.name, image: place.image, location: place.address, type: 'restaurant' }, index),
      imageKeyword: place.name || destination,
      openHours: place.description || 'Hours unavailable',
    }));
  },

  async searchAttractions(destination: string): Promise<PlacesAttractionResult[]> {
    const response = await apiFetch<SerpLocalPlaceResponse>('/api/places/search', {
      method: 'POST',
      body: JSON.stringify({ destination, category: 'attractions' }),
    });

    return response.places.map((place, index) => ({
      id: place.id,
      name: place.name,
      description: place.description || place.address,
      location: place.address,
      type: 'attraction',
      category: place.type || 'Attraction',
      photoUrl: place.image,
      image: resolvePlaceImage({ name: place.name, image: place.image, location: place.address, type: 'attraction', category: place.type }, index),
      imageKeyword: place.name || destination,
      entryFee: place.priceText || 'Check venue',
      duration: `${1 + (index % 3)}–${2 + (index % 3)} hours`,
      rating: place.rating || 4,
    }));
  },
};
