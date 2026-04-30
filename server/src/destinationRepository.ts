import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db';

type DestinationRow = RowDataPacket & {
  id: number;
  name: string;
  type: 'hotel' | 'restaurant' | 'attraction';
  description: string | null;
  location: string | null;
  image_url: string | null;
  price_range: string | null;
  rating: number | string | null;
  created_at: Date;
};

export interface DestinationRecord {
  id: string;
  name: string;
  type: 'hotel' | 'restaurant' | 'attraction';
  description: string;
  location: string;
  imageUrl: string;
  priceRange: string;
  rating: number;
  createdAt: string;
}

const DEFAULT_DESTINATIONS: Array<Omit<DestinationRecord, 'id' | 'createdAt'>> = [
  {
    name: 'Kyoto Ryokan Garden',
    type: 'hotel',
    description: 'Traditional ryokan stay near historic temples with quiet garden courtyards and easy access to central Kyoto.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$240/night',
    rating: 4.9,
  },
  {
    name: 'Kyoto Machiya Stay',
    type: 'hotel',
    description: 'Restored machiya townhouse stay with tatami rooms in a quiet Kyoto lane near Gion.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$210/night',
    rating: 4.8,
  },
  {
    name: 'Kyoto Temple View Hotel',
    type: 'hotel',
    description: 'Modern hotel with rooftop baths and temple district views, ideal for walking itineraries.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$195/night',
    rating: 4.7,
  },
  {
    name: 'Tokyo Sky Suites',
    type: 'hotel',
    description: 'Modern high-rise hotel with skyline views, direct rail access, and fast connections to Shibuya and Ginza.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$285/night',
    rating: 4.8,
  },
  {
    name: 'Shibuya Central Hotel',
    type: 'hotel',
    description: 'Design-forward city hotel a short walk from Shibuya Crossing with easy nightlife access.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$260/night',
    rating: 4.7,
  },
  {
    name: 'Asakusa River Hotel',
    type: 'hotel',
    description: 'Comfortable Tokyo stay near Senso-ji, river cruises, and neighborhood food markets.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$175/night',
    rating: 4.6,
  },
  {
    name: 'Ubud Jungle Villa',
    type: 'hotel',
    description: 'Private villa wrapped in rice terraces and tropical forest, ideal for a slower Bali itinerary.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$220/night',
    rating: 4.9,
  },
  {
    name: 'Bali Seminyak Resort',
    type: 'hotel',
    description: 'Stylish beach resort with pool clubs, spa access, and sunset dining in Seminyak.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$245/night',
    rating: 4.8,
  },
  {
    name: 'Bali Ocean Cliff Suites',
    type: 'hotel',
    description: 'Clifftop suites with plunge pools and quick access to southern Bali surf beaches.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$275/night',
    rating: 4.7,
  },
  {
    name: 'Amalfi Cliff Hotel',
    type: 'hotel',
    description: 'Coastal boutique hotel with sea-facing terraces and quick access to ferry routes along the Amalfi Coast.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$320/night',
    rating: 4.8,
  },
  {
    name: 'Positano Terrace Suites',
    type: 'hotel',
    description: 'Boutique Amalfi Coast stay with pastel terraces and panoramic Mediterranean views.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$355/night',
    rating: 4.8,
  },
  {
    name: 'Santorini Caldera Hotel',
    type: 'hotel',
    description: 'Whitewashed suites above the caldera with sunset views and walkable access to Oia.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$340/night',
    rating: 4.9,
  },
  {
    name: 'Santorini White Cave Suites',
    type: 'hotel',
    description: 'Cave-style suites with private terraces and easy access to Fira and Oia viewpoints.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1469796466635-455ede028aca?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$315/night',
    rating: 4.8,
  },
  {
    name: 'Santorini Harbor Retreat',
    type: 'hotel',
    description: 'Relaxed island hotel near the caldera trail with sunset decks and sea-view breakfasts.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$280/night',
    rating: 4.7,
  },
  {
    name: 'Bangkok Riverside Hotel',
    type: 'hotel',
    description: 'Contemporary riverside hotel close to river taxis, night markets, and the historic old town.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$165/night',
    rating: 4.7,
  },
  {
    name: 'Bangkok Old Town Suites',
    type: 'hotel',
    description: 'Comfortable old-town base near temples, local cafes, and the Chao Phraya ferry routes.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$145/night',
    rating: 4.6,
  },
  {
    name: 'Bangkok Skytrain Residence',
    type: 'hotel',
    description: 'Central Bangkok hotel with direct BTS access, rooftop pool, and short rides to major dining districts.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$185/night',
    rating: 4.7,
  },
  {
    name: 'Bangkok Garden Riverside Stay',
    type: 'hotel',
    description: 'Quiet riverside stay with garden courtyards and easy evening access to markets and riverboats.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$158/night',
    rating: 4.6,
  },
  {
    name: 'Marrakech Riad Maison',
    type: 'hotel',
    description: 'Courtyard riad in the old medina with rooftop dining and easy walking access to souks.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$155/night',
    rating: 4.8,
  },
  {
    name: 'Marrakech Palm Courtyard',
    type: 'hotel',
    description: 'Elegant riad with mosaic courtyards, hammam access, and guided medina walking routes.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$170/night',
    rating: 4.7,
  },
  {
    name: 'Trastevere Kitchen',
    type: 'restaurant',
    description: 'Roman neighborhood restaurant known for handmade pasta, seasonal produce, and late-night terrace seating.',
    location: 'Rome, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Rome Piazza Osteria',
    type: 'restaurant',
    description: 'Classic Roman trattoria with carbonara, cacio e pepe, and buzzing evening street seating.',
    location: 'Rome, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.6,
  },
  {
    name: 'Rome Campo Market Table',
    type: 'restaurant',
    description: 'Fresh produce-driven Roman menu close to Campo de Fiori and central evening walks.',
    location: 'Rome, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Cavo Sunset Taverna',
    type: 'restaurant',
    description: 'Aegean seafood taverna with sunset-facing tables and a strong local wine list.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.8,
  },
  {
    name: 'Santorini Cliffside Bistro',
    type: 'restaurant',
    description: 'Caldera-view bistro serving grilled octopus, mezze plates, and island wines at sunset.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Ubud Green Table',
    type: 'restaurant',
    description: 'Farm-to-table dining with Balinese flavors, vegetarian-friendly menus, and valley views.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Bali Beach Grill House',
    type: 'restaurant',
    description: 'Open-air Bali grill serving seafood platters, satay, and tropical cocktails near the shore.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.6,
  },
  {
    name: 'Bali Rice Terrace Cafe',
    type: 'restaurant',
    description: 'Laid-back cafe with local coffee, nasi campur, and panoramic Ubud rice terrace views.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.5,
  },
  {
    name: 'Tokyo Lantern Grill',
    type: 'restaurant',
    description: 'Contemporary grill house serving wagyu, robata dishes, and seasonal tasting menus.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$$',
    rating: 4.8,
  },
  {
    name: 'Tokyo Sushi Alley',
    type: 'restaurant',
    description: 'Compact Tokyo sushi counter with omakase lunch sets and fresh market fish daily.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.8,
  },
  {
    name: 'Tokyo Ramen Station',
    type: 'restaurant',
    description: 'Popular noodle spot for tonkotsu bowls, gyoza, and quick dinners after city exploring.',
    location: 'Tokyo, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.6,
  },
  {
    name: 'Bangkok River Prawn House',
    type: 'restaurant',
    description: 'Popular Bangkok seafood kitchen for grilled river prawns, spicy salads, and late-night dining.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Bangkok Street Noodle Corner',
    type: 'restaurant',
    description: 'Casual Bangkok noodle spot serving boat noodles, grilled skewers, and quick local lunches.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.5,
  },
  {
    name: 'Bangkok Rooftop Thai Grill',
    type: 'restaurant',
    description: 'Rooftop Bangkok grill with skyline views, Thai classics, and modern cocktail service.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.6,
  },
  {
    name: 'Kyoto Kaiseki House',
    type: 'restaurant',
    description: 'Seasonal kaiseki dining experience focused on Kyoto produce and refined presentation.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$$',
    rating: 4.8,
  },
  {
    name: 'Kyoto Lantern Noodles',
    type: 'restaurant',
    description: 'Casual noodle house with handmade udon, tempura sets, and a cozy lantern-lit interior.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.6,
  },
  {
    name: 'Fushimi Inari Shrine',
    type: 'attraction',
    description: 'Iconic hillside shrine route lined with vermilion torii gates and panoramic city viewpoints.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.9,
  },
  {
    name: 'Arashiyama Bamboo Grove',
    type: 'attraction',
    description: 'Famous bamboo pathway with nearby temples, river views, and scenic walking routes in western Kyoto.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1526481280695-3c4691f38f56?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.8,
  },
  {
    name: 'Kiyomizu-dera Temple',
    type: 'attraction',
    description: 'Historic Kyoto temple with sweeping hillside views and a classic eastern district approach.',
    location: 'Kyoto, Japan',
    imageUrl: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$',
    rating: 4.8,
  },
  {
    name: 'Uluwatu Temple',
    type: 'attraction',
    description: 'Dramatic sea-cliff temple famous for sunset views and traditional kecak dance performances.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$',
    rating: 4.8,
  },
  {
    name: 'Tegallalang Rice Terraces',
    type: 'attraction',
    description: 'Layered green rice terraces ideal for daytime walks, scenic cafes, and photography stops.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$',
    rating: 4.7,
  },
  {
    name: 'Bali Water Palace',
    type: 'attraction',
    description: 'Historic water palace complex with lotus ponds, ornate gateways, and eastern Bali character.',
    location: 'Bali, Indonesia',
    imageUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$',
    rating: 4.6,
  },
  {
    name: 'Colosseum',
    type: 'attraction',
    description: 'Historic Roman amphitheater and anchor landmark for central Rome itineraries.',
    location: 'Rome, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.8,
  },
  {
    name: 'Roman Forum Walk',
    type: 'attraction',
    description: 'Ancient civic heart of Rome with layered ruins, temples, and easy links to Palatine Hill.',
    location: 'Rome, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Trevi Fountain District',
    type: 'attraction',
    description: 'Classic Rome stop for evening walks, landmark photography, and surrounding piazza routes.',
    location: 'Rome, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.7,
  },
  {
    name: 'Oia Blue Dome Walk',
    type: 'attraction',
    description: 'Scenic walking route through the cliffside lanes and blue-domed viewpoints of Oia.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.9,
  },
  {
    name: 'Santorini Red Beach',
    type: 'attraction',
    description: 'Distinctive volcanic beach with red cliffs, clear water, and dramatic island geology.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.6,
  },
  {
    name: 'Santorini Caldera Trail',
    type: 'attraction',
    description: 'Scenic cliffside walking route connecting Fira and Oia with uninterrupted Aegean views.',
    location: 'Santorini, Greece',
    imageUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.8,
  },
  {
    name: 'Bangkok Grand Palace',
    type: 'attraction',
    description: 'Historic palace complex with ornate temples, ceremonial halls, and one of Bangkok’s most visited landmarks.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Bangkok Floating Market',
    type: 'attraction',
    description: 'Canal-side market experience with local snacks, souvenirs, and traditional wooden boats.',
    location: 'Bangkok, Thailand',
    imageUrl: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$',
    rating: 4.5,
  },
  {
    name: 'Paris Left Bank Hotel',
    type: 'hotel',
    description: 'Classic Paris stay near the Seine with easy metro access to the Louvre, Notre-Dame, and Saint-Germain.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$295/night',
    rating: 4.8,
  },
  {
    name: 'Le Marais Grand Maison',
    type: 'hotel',
    description: 'Boutique hotel in Le Marais with elegant rooms, walkable galleries, and late-night cafe access.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$310/night',
    rating: 4.7,
  },
  {
    name: 'Paris Seine View Suites',
    type: 'hotel',
    description: 'River-facing suites with balcony views and quick access to central museum and shopping districts.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$335/night',
    rating: 4.8,
  },
  {
    name: 'Saint-Germain Bistro Atelier',
    type: 'restaurant',
    description: 'Paris bistro focused on onion soup, duck confit, and polished Saint-Germain evening service.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Montmartre Supper Club',
    type: 'restaurant',
    description: 'Hilltop dining room serving French classics, wine flights, and city views after sunset walks.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.6,
  },
  {
    name: 'Seine Corner Brasserie',
    type: 'restaurant',
    description: 'All-day brasserie with steak frites, fresh pastries, and terrace seating near central river walks.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.5,
  },
  {
    name: 'Eiffel Tower',
    type: 'attraction',
    description: 'Paris landmark with panoramic observation decks, evening illuminations, and Champ de Mars views.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.8,
  },
  {
    name: 'Louvre Museum',
    type: 'attraction',
    description: 'World-famous museum with major art collections, iconic galleries, and half-day exploration routes.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1566139993099-7f9b1fe3c59a?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.8,
  },
  {
    name: 'Montmartre Sacre-Coeur Walk',
    type: 'attraction',
    description: 'Atmospheric hilltop route through Montmartre streets, artist squares, and Sacre-Coeur viewpoints.',
    location: 'Paris, France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.7,
  },
  {
    name: 'Manhattan Skyline Hotel',
    type: 'hotel',
    description: 'Midtown hotel with skyline-facing rooms and quick subway access to Broadway, Bryant Park, and downtown.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$360/night',
    rating: 4.7,
  },
  {
    name: 'SoHo Loft Stay',
    type: 'hotel',
    description: 'Industrial-chic SoHo stay surrounded by shopping streets, downtown dining, and gallery blocks.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$345/night',
    rating: 4.6,
  },
  {
    name: 'Central Park South Suites',
    type: 'hotel',
    description: 'Upscale suites near Central Park with generous rooms and quick access to museums and Fifth Avenue.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$395/night',
    rating: 4.8,
  },
  {
    name: 'Hudson Smokehouse Table',
    type: 'restaurant',
    description: 'New York comfort-food room serving brisket, roast chicken, and seasonal cocktails near the riverfront.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.6,
  },
  {
    name: 'Flatiron Pasta Room',
    type: 'restaurant',
    description: 'Bustling Manhattan dining room known for fresh pasta, burrata starters, and lively dinner service.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Brooklyn Pier Oyster Bar',
    type: 'restaurant',
    description: 'Waterfront seafood spot for oysters, lobster rolls, and East River sunset dining.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.5,
  },
  {
    name: 'Central Park Loop',
    type: 'attraction',
    description: 'Classic New York walking route past lakes, bridges, lawns, and major park viewpoints.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.8,
  },
  {
    name: 'Metropolitan Museum of Art',
    type: 'attraction',
    description: 'Flagship museum with global collections, rooftop views, and full-day cultural itineraries.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.8,
  },
  {
    name: 'Brooklyn Bridge Walk',
    type: 'attraction',
    description: 'Scenic bridge crossing with skyline views and easy links to DUMBO and Lower Manhattan.',
    location: 'New York, USA',
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.7,
  },
  {
    name: 'Marina Bay Horizon Hotel',
    type: 'hotel',
    description: 'Modern Singapore stay near waterfront promenades, downtown shopping, and evening skyline views.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$310/night',
    rating: 4.8,
  },
  {
    name: 'Singapore Heritage Quarters',
    type: 'hotel',
    description: 'Boutique stay between Chinatown and civic landmarks with stylish rooms and strong transit access.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$255/night',
    rating: 4.6,
  },
  {
    name: 'Orchard Light Hotel',
    type: 'hotel',
    description: 'Comfortable city base near Orchard Road shopping, hawker centres, and MRT connections.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$235/night',
    rating: 4.5,
  },
  {
    name: 'Maxwell Satay Kitchen',
    type: 'restaurant',
    description: 'Hawker-style dining stop for satay, chicken rice, and fast local lunch plates.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.6,
  },
  {
    name: 'Katong Spice Veranda',
    type: 'restaurant',
    description: 'Peranakan-inspired menu with laksa, grilled seafood, and neighborhood dessert favorites.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Clarke Quay River Table',
    type: 'restaurant',
    description: 'Lively riverside dining with chili crab, shared plates, and evening waterfront energy.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.6,
  },
  {
    name: 'Gardens by the Bay',
    type: 'attraction',
    description: 'Futuristic waterfront gardens with cooled conservatories, Supertrees, and evening light shows.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.8,
  },
  {
    name: 'Singapore Botanic Gardens',
    type: 'attraction',
    description: 'UNESCO-listed tropical gardens with orchid displays, shaded walking routes, and picnic lawns.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.7,
  },
  {
    name: 'Marina Bay Sands SkyPark',
    type: 'attraction',
    description: 'Observation deck with panoramic skyline views over Marina Bay, the port, and central Singapore.',
    location: 'Singapore, Singapore',
    imageUrl: 'https://images.unsplash.com/photo-1496939376851-89342e90adcd?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Amalfi Lemon Grove Suites',
    type: 'hotel',
    description: 'Terraced coastal stay with sea breezes, lemon-grove breakfasts, and access to nearby cliff villages.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$345/night',
    rating: 4.7,
  },
  {
    name: 'Positano Seaview Trattoria',
    type: 'restaurant',
    description: 'Coastal Italian dining with anchovy pasta, citrus desserts, and postcard sunset views.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.7,
  },
  {
    name: 'Amalfi Harbor Seafood Room',
    type: 'restaurant',
    description: 'Harborfront table for grilled catch, local white wine, and relaxed late-afternoon meals.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.6,
  },
  {
    name: 'Path of the Gods Trail',
    type: 'attraction',
    description: 'Scenic Amalfi Coast hiking route with mountain-to-sea views and cliffside village panoramas.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
    priceRange: 'Free',
    rating: 4.8,
  },
  {
    name: 'Ravello Villa Rufolo Gardens',
    type: 'attraction',
    description: 'Historic cliffside gardens and terraces overlooking the coastline, ideal for a slow afternoon stop.',
    location: 'Amalfi Coast, Italy',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Marrakech Medina Hideaway',
    type: 'hotel',
    description: 'Refined riad with patterned courtyards, plunge pool, and guided access to old-city sights.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$162/night',
    rating: 4.7,
  },
  {
    name: 'Jemaa El-Fna Grill Court',
    type: 'restaurant',
    description: 'Lively Marrakech restaurant serving tagines, grilled meats, and mint tea near the night market.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.6,
  },
  {
    name: 'Majorelle Courtyard Kitchen',
    type: 'restaurant',
    description: 'Garden-side dining room with couscous, vegetable mezze, and relaxed shaded lunches.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$$',
    rating: 4.5,
  },
  {
    name: 'Jardin Majorelle',
    type: 'attraction',
    description: 'Iconic cobalt-blue garden with exotic plants, museum spaces, and one of Marrakech’s signature stops.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$$',
    rating: 4.7,
  },
  {
    name: 'Bahia Palace',
    type: 'attraction',
    description: 'Decorated palace complex with courtyards, carved ceilings, and a strong sense of royal Marrakech history.',
    location: 'Marrakech, Morocco',
    imageUrl: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1200&q=80',
    priceRange: '$',
    rating: 4.6,
  },
];

function mapDestinationRow(row: DestinationRow): DestinationRecord {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    description: row.description || '',
    location: row.location || '',
    imageUrl: row.image_url || '',
    priceRange: row.price_range || '',
    rating: Number(row.rating || 4.5),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listDestinations() {
  const [rows] = await pool.execute<DestinationRow[]>(
    `SELECT id, name, type, description, location, image_url, price_range, rating, created_at
     FROM destinations
     WHERE TRIM(COALESCE(location, '')) <> ''
     ORDER BY created_at DESC`,
  );

  return rows.map(mapDestinationRow);
}

export async function listLatestDestinations(limit = 12, type?: DestinationRecord['type']) {
  const query = type
    ? `SELECT id, name, type, description, location, image_url, price_range, rating, created_at
       FROM destinations
     WHERE type = ? AND TRIM(COALESCE(location, '')) <> ''
       ORDER BY created_at DESC
       LIMIT ?`
    : `SELECT id, name, type, description, location, image_url, price_range, rating, created_at
       FROM destinations
     WHERE TRIM(COALESCE(location, '')) <> ''
       ORDER BY created_at DESC
       LIMIT ?`;

  const params = type ? [type, limit] : [limit];
  const [rows] = await pool.execute<DestinationRow[]>(query, params);

  return rows.map(mapDestinationRow);
}

export async function searchDestinations(query?: string, limit = 100, type?: DestinationRecord['type']) {
  const trimmedQuery = query?.trim();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (type) {
    clauses.push('type = ?');
    params.push(type);
  }

  if (trimmedQuery) {
    clauses.push('(name LIKE ? OR location LIKE ? OR description LIKE ?)');
    const like = `%${trimmedQuery}%`;
    params.push(like, like, like);
  }

  clauses.push(`TRIM(COALESCE(location, '')) <> ''`);

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit);

  const [rows] = await pool.execute<DestinationRow[]>(
    `SELECT id, name, type, description, location, image_url, price_range, rating, created_at
     FROM destinations
     ${whereClause}
     ORDER BY rating DESC, created_at DESC
     LIMIT ?`,
    params,
  );

  return rows.map(mapDestinationRow);
}

export async function seedDefaultDestinations() {
  for (const destination of DEFAULT_DESTINATIONS) {
    await pool.execute(
      `INSERT INTO destinations (name, type, description, location, image_url, price_range, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         type = VALUES(type),
         description = VALUES(description),
         location = VALUES(location),
         image_url = VALUES(image_url),
         price_range = VALUES(price_range),
         rating = VALUES(rating)`,
      [
        destination.name,
        destination.type,
        destination.description || null,
        destination.location || null,
        destination.imageUrl || null,
        destination.priceRange || null,
        destination.rating,
      ],
    );
  }
}

export async function createDestination(input: Omit<DestinationRecord, 'id' | 'createdAt'>) {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO destinations (name, type, description, location, image_url, price_range, rating)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.type,
      input.description || null,
      input.location || null,
      input.imageUrl || null,
      input.priceRange || null,
      input.rating,
    ],
  );

  const [rows] = await pool.execute<DestinationRow[]>(
    `SELECT id, name, type, description, location, image_url, price_range, rating, created_at
     FROM destinations
     WHERE id = ? LIMIT 1`,
    [result.insertId],
  );

  return rows[0] ? mapDestinationRow(rows[0]) : null;
}

export async function updateDestination(id: number, input: Partial<Omit<DestinationRecord, 'id' | 'createdAt'>>) {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (typeof input.name === 'string') {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (typeof input.type === 'string') {
    fields.push('type = ?');
    values.push(input.type);
  }
  if (typeof input.description === 'string') {
    fields.push('description = ?');
    values.push(input.description || null);
  }
  if (typeof input.location === 'string') {
    fields.push('location = ?');
    values.push(input.location || null);
  }
  if (typeof input.imageUrl === 'string') {
    fields.push('image_url = ?');
    values.push(input.imageUrl || null);
  }
  if (typeof input.priceRange === 'string') {
    fields.push('price_range = ?');
    values.push(input.priceRange || null);
  }
  if (typeof input.rating === 'number') {
    fields.push('rating = ?');
    values.push(input.rating);
  }

  if (fields.length === 0) {
    return null;
  }

  values.push(id);
  await pool.execute(`UPDATE destinations SET ${fields.join(', ')} WHERE id = ?`, values);

  const [rows] = await pool.execute<DestinationRow[]>(
    `SELECT id, name, type, description, location, image_url, price_range, rating, created_at
     FROM destinations
     WHERE id = ? LIMIT 1`,
    [id],
  );

  return rows[0] ? mapDestinationRow(rows[0]) : null;
}

export async function deleteDestination(id: number) {
  await pool.execute(`DELETE FROM destinations WHERE id = ?`, [id]);
}