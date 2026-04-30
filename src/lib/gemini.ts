import { GoogleGenAI, Type } from "@google/genai";
import { apiFetch } from './api';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-2.0-flash";

async function generateWithRetry(params: Parameters<typeof ai.models.generateContent>[0], retries = 3): Promise<Awaited<ReturnType<typeof ai.models.generateContent>>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: unknown) {
      const isQuotaError =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        (err as { status: number }).status === 429;
      if (isQuotaError && attempt < retries) {
        const delay = (attempt + 1) * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

export interface RecommendedDestination {
  name: string;
  location: string;
  description: string;
  type: 'hotel' | 'restaurant' | 'attraction';
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  rating: number;
  reason: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  city: string;
  country: string;
  propertyType: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  reviewCount: number;
  isGuestFavourite: boolean;
  imageKeyword: string;
  beds: number;
  baths: number;
}

export interface HotelResult {
  id: string;
  name: string;
  address: string;
  rating: number;
  pricePerNight: number;
  currency: string;
  stars: number;
  imageKeyword: string;
  amenities: string[];
}

export interface RestaurantResult {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  rating: number;
  priceRange: string;
  imageKeyword: string;
  openHours: string;
}

export interface AttractionResult {
  id: string;
  name: string;
  description: string;
  location: string;
  category: string;
  imageKeyword: string;
  entryFee: string;
  duration: string;
}

export interface FlightResult {
  id: string;
  airline: string;
  code: string;
  flightNumber: string;
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  price: number;
  currency: string;
  type: string;
  airlineLogo?: string;
  departureToken?: string;
}

export const geminiService = {
  async getRecommendations(preferences?: string): Promise<RecommendedDestination[]> {
    try {
      const prompt = preferences 
        ? `Recommend 6 travel destinations based on these preferences: ${preferences}. Return a diverse mix of hotels, restaurants, and attractions.`
        : "Recommend 6 trending and unique travel destinations worldwide for 2026. Return a mix of hotels, restaurants, and attractions.";

      const response = await generateWithRetry({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                location: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  enum: ['hotel', 'restaurant', 'attraction'] 
                },
                priceRange: { 
                  type: Type.STRING, 
                  enum: ['$', '$$', '$$$', '$$$$'] 
                },
                rating: { type: Type.NUMBER },
                reason: { 
                  type: Type.STRING, 
                  description: "Why this is recommended" 
                }
              },
              required: ["name", "location", "description", "type", "priceRange", "rating", "reason"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini recommendation error:", error);
      return [];
    }
  },

  async getPropertyListings(city?: string): Promise<PropertyListing[]> {
    try {
      const prompt = city
        ? `Generate 8 realistic property listings (homes, apartments, flats, villas) available for short-term rental in ${city} for 2026. Include a mix of types and price points.`
        : "Generate 12 realistic property listings (homes, apartments, flats, villas) available for short-term rental across popular Asian and European travel cities in 2026. Include cities like Singapore, Tokyo, Seoul, Bali, Paris, and Johor Bahru.";

      const response = await generateWithRetry({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                city: { type: Type.STRING },
                country: { type: Type.STRING },
                propertyType: { type: Type.STRING },
                pricePerNight: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviewCount: { type: Type.NUMBER },
                isGuestFavourite: { type: Type.BOOLEAN },
                imageKeyword: { type: Type.STRING, description: "A short keyword for the property image, e.g. 'modern apartment singapore'" },
                beds: { type: Type.NUMBER },
                baths: { type: Type.NUMBER },
              },
              required: ["id", "title", "city", "country", "propertyType", "pricePerNight", "currency", "rating", "reviewCount", "isGuestFavourite", "imageKeyword", "beds", "baths"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini listings error:", error);
      return [];
    }
  },

  async getHotelsByDestination(destination: string): Promise<HotelResult[]> {
    try {
      const response = await generateWithRetry({
        model: GEMINI_MODEL,
        contents: `List 9 real or realistic hotels in "${destination}" for 2026. Include a range from budget to luxury. For imageKeyword use a descriptive short phrase like "luxury hotel lobby paris".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                pricePerNight: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                stars: { type: Type.NUMBER },
                imageKeyword: { type: Type.STRING },
                amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["id", "name", "address", "rating", "pricePerNight", "currency", "stars", "imageKeyword", "amenities"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini hotels error:", error);
      return [];
    }
  },

  async getRestaurantsByDestination(destination: string): Promise<RestaurantResult[]> {
    try {
      const response = await generateWithRetry({
        model: GEMINI_MODEL,
        contents: `List 9 real or realistic restaurants in "${destination}" for 2026. Include a variety of cuisines and price ranges. For imageKeyword use something like "japanese ramen restaurant tokyo".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                cuisine: { type: Type.STRING },
                address: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                priceRange: { type: Type.STRING },
                imageKeyword: { type: Type.STRING },
                openHours: { type: Type.STRING },
              },
              required: ["id", "name", "cuisine", "address", "rating", "priceRange", "imageKeyword", "openHours"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini restaurants error:", error);
      return [];
    }
  },

  async getAttractionsByDestination(destination: string): Promise<AttractionResult[]> {
    try {
      const response = await generateWithRetry({
        model: GEMINI_MODEL,
        contents: `List 9 top tourist attractions and places to visit in "${destination}" for 2026. Include museums, landmarks, parks, and unique experiences. For imageKeyword use something like "eiffel tower paris night".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                location: { type: Type.STRING },
                category: { type: Type.STRING },
                imageKeyword: { type: Type.STRING },
                entryFee: { type: Type.STRING },
                duration: { type: Type.STRING },
              },
              required: ["id", "name", "description", "location", "category", "imageKeyword", "entryFee", "duration"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini attractions error:", error);
      return [];
    }
  },

  async searchFlights(
    from: string,
    to: string,
    outboundDate: string,
    options: { returnDate?: string; currency?: string; hl?: string } = {},
  ): Promise<FlightResult[]> {
    const response = await apiFetch<{ flights: FlightResult[] }>('/api/flights/search', {
      method: 'POST',
      body: JSON.stringify({
        from,
        to,
        outboundDate,
        returnDate: options.returnDate,
        currency: options.currency || 'USD',
        hl: options.hl || 'en',
      }),
    });

    return response.flights;
  }
};
