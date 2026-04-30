import { getJson } from 'serpapi';
import { env } from './env';

export type LocalSearchCategory = 'hotels' | 'restaurants' | 'attractions';

export interface LocalSearchPlaceResult {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  priceText: string;
  description: string;
  image: string;
  type: string;
}

type SerpLocalPlace = {
  title?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  description?: string;
  thumbnail?: string;
  place_id?: string;
  type?: string;
};

const QUERY_BY_CATEGORY: Record<LocalSearchCategory, string> = {
  hotels: 'hotels',
  restaurants: 'restaurants',
  attractions: 'tourist attractions',
};

export async function searchLocalPlacesWithSerpApi(input: {
  destination: string;
  category: LocalSearchCategory;
}) {
  if (!env.serpApiKey) {
    throw new Error('SERPAPI_API_KEY is not configured.');
  }

  const queryBase = QUERY_BY_CATEGORY[input.category];
  const response = await getJson({
    engine: 'google',
    api_key: env.serpApiKey,
    q: `${queryBase} in ${input.destination}`,
    location: input.destination,
    google_domain: 'google.com',
    device: 'desktop',
    hl: 'en',
  }) as {
    local_results?: {
      places?: SerpLocalPlace[];
    };
  };

  const places = (response.local_results?.places || [])
    .map((place, index): LocalSearchPlaceResult | null => {
      if (!place.title) {
        return null;
      }

      return {
        id: place.place_id || `${input.category}-${index}`,
        name: place.title,
        address: place.address || input.destination,
        rating: place.rating ?? 4,
        reviewCount: place.reviews ?? 0,
        priceText: place.price || '',
        description: place.description || '',
        image: place.thumbnail || '',
        type: place.type || queryBase,
      };
    })
    .filter((place): place is LocalSearchPlaceResult => place !== null)
    .slice(0, 12);

  return { places };
}