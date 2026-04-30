import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TravelImageCategory = 'beach' | 'city' | 'hotel' | 'restaurant' | 'attraction' | 'travel';

/* ── Travel image helper (replaces deprecated source.unsplash.com) ── */
// Curated real Unsplash photo IDs by category
const HOTEL_PHOTOS = [
  'photo-1566073771259-6a8506099945',
  'photo-1520250497591-112f2f40a3f4',
  'photo-1564501049412-61c2a3083791',
  'photo-1445019980597-93fa8acb246c',
  'photo-1542314831-068cd1dbfeeb',
  'photo-1578683010236-d716f9a3f461',
];
const RESTAURANT_PHOTOS = [
  'photo-1517248135467-4c7edcad34c4',
  'photo-1414235077428-338989a2e8c0',
  'photo-1552566626-52f8b828add9',
  'photo-1569718212165-3a8278d5f624',
  'photo-1554118811-1e0d58224f24',
  'photo-1424847651672-bf20a4b0982b',
];
const ATTRACTION_PHOTOS = [
  'photo-1499856871958-5b9627545d1a',
  'photo-1506905925346-21bda4d32df4',
  'photo-1552465011-b4e21bf6e79a',
  'photo-1542621334-a254cf47733d',
  'photo-1555881400-74d7acaacd8b',
  'photo-1488085061387-422e29b40080',
];
const BEACH_PHOTOS = [
  'photo-1507525428034-b723cf961d3e',
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1519046904884-53103b34b206',
  'photo-1483683804023-6ccdb62f86ef',
];
const CITY_PHOTOS = [
  'photo-1540959733332-eab4deabeeaf',
  'photo-1525625232717-121ed31e22e7',
  'photo-1601621915196-2621bfb0cd6e',
  'photo-1552832230-c0197dd311b5',
  'photo-1431274172761-fcdab704a698',
  'photo-1537996194471-e657df975ab4',
];
const GENERIC_TRAVEL = [
  ...HOTEL_PHOTOS, ...BEACH_PHOTOS, ...CITY_PHOTOS, ...ATTRACTION_PHOTOS,
];

const CATEGORY_POOLS: Record<TravelImageCategory, string[]> = {
  beach: BEACH_PHOTOS,
  city: CITY_PHOTOS,
  hotel: HOTEL_PHOTOS,
  restaurant: RESTAURANT_PHOTOS,
  attraction: ATTRACTION_PHOTOS,
  travel: GENERIC_TRAVEL,
};

const SPECIFIC_PLACE_PHOTOS: Record<string, string> = {
  'amalfi coast': 'photo-1533105079780-92b9be482077',
  amsterdam: 'photo-1512470876302-972faa2aa9a4',
  athens: 'photo-1555993539-1732b0258235',
  auckland: 'photo-1507699622108-4be3abd695ad',
  'banff': 'photo-1510798831971-661eb04b3739',
  bangkok: 'photo-1508009603885-50cf7c579365',
  bali: 'photo-1537996194471-e657df975ab4',
  barcelona: 'photo-1543783207-ec64e4d95325',
  berlin: 'photo-1560969184-10fe8719e047',
  bogota: 'photo-1531065208531-4036c0dba3ca',
  boracay: 'photo-1506953823976-52e1fdc0149a',
  bordeaux: 'photo-1494790108377-be9c29b29330',
  bruges: 'photo-1541849546-216549ae216d',
  budapest: 'photo-1551867633-194f125bddfa',
  cairo: 'photo-1539768942893-daf53e448371',
  'cape town': 'photo-1580060839134-75a5edca2e99',
  cartagena: 'photo-1536098561742-ca998e48cbcc',
  chiang: 'photo-1512552288940-29d6ff1d5944',
  copenhagen: 'photo-1513622470522-26c3c8a854bc',
  'costa rica': 'photo-1465379944081-7f47de8d74ac',
  dubai: 'photo-1512453979798-5ea266f8880c',
  dubrovnik: 'photo-1555990538-17392d2fd4cf',
  edinburgh: 'photo-1526129318478-62ed807ebdf9',
  florence: 'photo-1543429257-3eb0b65d2c81',
  flores: 'photo-1566865204669-02d7be879ce0',
  galapagos: 'photo-1544737151-6e4b8d4d3f2f',
  geneva: 'photo-1501594907352-04cda38ebc29',
  goa: 'photo-1512343879784-a960bf40e7f2',
  'ha long': 'photo-1528127269322-539801943592',
  hanoi: 'photo-1509030450996-dd1a26dda07a',
  havana: 'photo-1519985176271-adb1088fa94c',
  hokkaido: 'photo-1518991950965-6f9765e44e5a',
  'hoi an': 'photo-1559592413-7cbb8b21e1b0',
  iceland: 'photo-1531366936337-7c912a4589a7',
  interlaken: 'photo-1500530855697-b586d89ba3ee',
  istanbul: 'photo-1524231757912-21f4fe3a7200',
  jaipur: 'photo-1477587458883-47145ed94245',
  kyoto: 'photo-1493976040374-85c8e12f0c0e',
  'kuala lumpur': 'photo-1596422846543-75c6fc197f07',
  'lake bled': 'photo-1464822759023-fed622ff2c3b',
  'lake como': 'photo-1499678329028-101435549a4e',
  langkawi: 'photo-1506665531195-3566af2b4dfa',
  lisbon: 'photo-1513735492246-483525079686',
  lofoten: 'photo-1517821099601-9a855f4428d1',
  london: 'photo-1513635269975-59663e0ac1ad',
  maldives: 'photo-1573843981267-be1999ff37cd',
  marrakech: 'photo-1553913861-c0fddf2619ee',
  'machu picchu': 'photo-1526392060635-9d6019884377',
  maui: 'photo-1507525428034-b723cf961d3e',
  melbourne: 'photo-1514395462725-fb4566210144',
  mexico: 'photo-1512813195386-6cf811ad3542',
  miami: 'photo-1535498730771-e735b998cd64',
  mykonos: 'photo-1601581875309-fafbf2d3ed3a',
  nairobi: 'photo-1547471080-7cc2caa01a7e',
  'new york': 'photo-1485871981521-5b1fd3805eee',
  oaxaca: 'photo-1518105779142-d975f22f1b0a',
  osaka: 'photo-1540959733332-eab4deabeeaf',
  palawan: 'photo-1561731216-c3a4d99437d5',
  paris: 'photo-1431274172761-fcdab704a698',
  patagonia: 'photo-1518509562904-e7ef99cdcc86',
  penang: 'photo-1526481280695-3c4691f8f0d7',
  petra: 'photo-1579606032821-4e6161c81bd3',
  'phong nha': 'photo-1586348943529-beaae6c28db9',
  phuket: 'photo-1507525428034-b723cf961d3e',
  porto: 'photo-1555881400-74d7acaacd8b',
  positano: 'photo-1599484527396-54f2db7af714',
  prague: 'photo-1592906209472-a36b1f3782ef',
  queenstown: 'photo-1507699622108-4be3abd695ad',
  reykjavik: 'photo-1518991950965-6f9765e44e5a',
  rome: 'photo-1552832230-c0197dd311b5',
  rovaniemi: 'photo-1515238152791-8216bfdf89a7',
  salzburg: 'photo-1472396961693-142e6e269027',
  santorini: 'photo-1570077188670-e3a8d69ac5ff',
  seoul: 'photo-1549693578-d683be217e58',
  serengeti: 'photo-1516426122078-c23e76319801',
  'siem reap': 'photo-1552733407-5d5c46c3bb3b',
  singapore: 'photo-1525625232717-121ed31e22e7',
  sydney: 'photo-1506973035872-a4ec16b8e8d9',
  tallinn: 'photo-1571501679680-de32f1e7aad4',
  tokyo: 'photo-1540959733332-eab4deabeeaf',
  tromsø: 'photo-1531366936337-7c912a4589a7',
  tromso: 'photo-1531366936337-7c912a4589a7',
  tulum: 'photo-1510097467424-192d713fd8b2',
  tuscany: 'photo-1521295121783-8a321d551ad2',
  venice: 'photo-1523906834658-6e24ef2386f9',
  vienna: 'photo-1516550893923-42d28e5677af',
  zanzibar: 'photo-1519046904884-53103b34b206',
  zermatt: 'photo-1521295121783-8a321d551ad2',
  zurich: 'photo-1501594907352-04cda38ebc29',
};

function specificPlaceImg(keyword: string) {
  const match = Object.entries(SPECIFIC_PLACE_PHOTOS)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([key]) => keyword.includes(key));

  return match
    ? `https://images.unsplash.com/${match[1]}?auto=format&fit=crop&w=800&q=80`
    : null;
}

function hashText(value: string) {
  return value.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

export function detectTravelImageCategory(keyword: string): TravelImageCategory {
  const normalized = keyword.toLowerCase();
  if (/beach|ocean|sea|coast|shore|wave|surf|island|lagoon/.test(normalized)) return 'beach';
  if (/hotel|villa|resort|inn|lodge|suite|accommodat|stay|room/.test(normalized)) return 'hotel';
  if (/restaurant|food|dining|cafe|café|eat|bistro|grill|kitchen|noodle|bar/.test(normalized)) return 'restaurant';
  if (/museum|temple|heritage|historic|attraction|park|garden|market|sight|viewpoint|monument/.test(normalized)) return 'attraction';
  if (/city|urban|town|skyline|street|district|downtown/.test(normalized)) return 'city';
  return 'travel';
}

function buildUnsplashUrl(photoId: string) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`;
}

export function pickCategoryImage(category: TravelImageCategory, seed = 0, exclude?: string | null): string {
  const pool = CATEGORY_POOLS[category] || CATEGORY_POOLS.travel;
  const normalizedExclude = exclude?.trim() || null;
  const candidates = normalizedExclude
    ? pool.filter((photoId) => buildUnsplashUrl(photoId) !== normalizedExclude)
    : pool;
  const source = candidates.length > 0 ? candidates : pool;
  return buildUnsplashUrl(source[Math.abs(seed) % source.length]);
}

export function randomTravelImg(keyword: string, index = 0, exclude?: string | null): string {
  const trimmed = keyword.trim();
  const safeKeyword = trimmed || 'travel destination';
  if (safeKeyword.startsWith('http') || safeKeyword.startsWith('/') || safeKeyword.startsWith('data:') || safeKeyword.startsWith('blob:')) {
    return safeKeyword;
  }

  const normalized = safeKeyword.toLowerCase();
  const specific = specificPlaceImg(normalized);
  if (specific && specific !== exclude) {
    return specific;
  }

  const category = detectTravelImageCategory(normalized);
  const seed = hashText(`${safeKeyword}:${index}`);
  return pickCategoryImage(category, seed, exclude);
}

export function travelImg(keyword: string, index = 0): string {
  return randomTravelImg(keyword, index);
}
