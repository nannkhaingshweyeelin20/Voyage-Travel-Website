import { env } from './env';

export interface FlightSearchResult {
  id: string;
  airline: string;
  code: string;
  flightNumber: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  airlineLogo?: string;
  type: string;
  departureToken?: string;
}

type AmadeusLocationPoint = {
  iataCode?: string;
  at?: string;
};

type AmadeusSegment = {
  departure?: AmadeusLocationPoint;
  arrival?: AmadeusLocationPoint;
  carrierCode?: string;
  number?: string;
};

type AmadeusItinerary = {
  duration?: string;
  segments?: AmadeusSegment[];
};

type AmadeusOffer = {
  id: string;
  itineraries?: AmadeusItinerary[];
  price?: {
    grandTotal?: string;
    currency?: string;
  };
};

function makeFallbackFlights(input: {
  from: string;
  to: string;
  outboundDate: string;
  currency?: string;
}, departureId: string, arrivalId: string): FlightSearchResult[] {
  const airlines = [
    { airline: 'United', code: 'UA' },
    { airline: 'Delta', code: 'DL' },
    { airline: 'American', code: 'AA' },
    { airline: 'Singapore Airlines', code: 'SQ' },
  ];
  const hash = `${input.from}-${input.to}-${input.outboundDate}`
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return airlines.map((carrier, index) => {
    const departureHour = 6 + index * 4;
    const departureMinute = (hash + index * 13) % 60;
    const totalMinutes = 300 + (hash % 240) + index * 70;
    const arrivalHour = (departureHour + Math.floor(totalMinutes / 60)) % 24;
    const arrivalMinute = (departureMinute + totalMinutes) % 60;
    return {
      id: `fallback-${carrier.code}-${index}`,
      airline: carrier.airline,
      code: carrier.code,
      flightNumber: `${carrier.code} ${200 + index * 17}`,
      departTime: `${input.outboundDate} ${String(departureHour).padStart(2, '0')}:${String(departureMinute).padStart(2, '0')}`,
      arriveTime: `${input.outboundDate} ${String(arrivalHour).padStart(2, '0')}:${String(arrivalMinute).padStart(2, '0')}`,
      duration: formatDuration(totalMinutes),
      price: 280 + (hash % 220) + index * 85,
      currency: input.currency || 'USD',
      stops: index === 0 ? 0 : index === 1 ? 1 : 2,
      from: input.from,
      fromCode: departureId,
      to: input.to,
      toCode: arrivalId,
      type: 'Estimated',
    };
  });
}

const AIRPORT_BY_PLACE: Record<string, string> = {
  amsterdam: 'AMS',
  argentina: 'EZE',
  athens: 'ATH',
  auckland: 'AKL',
  austin: 'AUS',
  bali: 'DPS',
  bangkok: 'BKK',
  banff: 'YYC',
  barcelona: 'BCN',
  beijing: 'PEK',
  berlin: 'BER',
  bogota: 'BOG',
  boracay: 'MPH',
  bordeaux: 'BOD',
  brazil: 'GRU',
  bruges: 'BRU',
  budapest: 'BUD',
  cambodia: 'PNH',
  cairo: 'CAI',
  'cape town': 'CPT',
  cartagena: 'CTG',
  'chiang mai': 'CNX',
  chile: 'SCL',
  colombo: 'CMB',
  copenhagen: 'CPH',
  'costa rica': 'SJO',
  dubai: 'DXB',
  dubrovnik: 'DBV',
  edinburgh: 'EDI',
  egypt: 'CAI',
  flores: 'LBJ',
  florence: 'FLR',
  france: 'CDG',
  geneva: 'GVA',
  germany: 'FRA',
  goa: 'GOI',
  greece: 'ATH',
  hanoi: 'HAN',
  havana: 'HAV',
  'ha long': 'HAN',
  hokkaido: 'CTS',
  'hoi an': 'DAD',
  iceland: 'KEF',
  indonesia: 'CGK',
  interlaken: 'ZRH',
  istanbul: 'IST',
  italy: 'FCO',
  jaipur: 'JAI',
  japan: 'HND',
  jordan: 'AMM',
  kohsamui: 'USM',
  'koh samui': 'USM',
  kotor: 'TGD',
  kyoto: 'KIX',
  'kuala lumpur': 'KUL',
  malaysia: 'KUL',
  'lake bled': 'LJU',
  'lake como': 'MXP',
  langkawi: 'LGK',
  laos: 'VTE',
  lisbon: 'LIS',
  lofoten: 'LKN',
  london: 'LHR',
  'luang prabang': 'LPQ',
  machu: 'CUZ',
  madrid: 'MAD',
  maldives: 'MLE',
  marrakech: 'RAK',
  maui: 'OGG',
  melbourne: 'MEL',
  mombasa: 'MBA',
  monteverde: 'SJO',
  morocco: 'CMN',
  muscat: 'MCT',
  myanmar: 'RGN',
  mykonos: 'JMK',
  nairobi: 'NBO',
  'new york': 'JFK',
  'nha trang': 'CXR',
  newzealand: 'AKL',
  'new zealand': 'AKL',
  oaxaca: 'OAX',
  osaka: 'KIX',
  palawan: 'PPS',
  paris: 'CDG',
  paro: 'PBH',
  patagonia: 'FTE',
  penang: 'PEN',
  petra: 'AQJ',
  'phong nha': 'VDH',
  'phu quoc': 'PQC',
  phuket: 'HKT',
  philippines: 'MNL',
  porto: 'OPO',
  positano: 'NAP',
  prague: 'PRG',
  portugal: 'LIS',
  queenstown: 'ZQN',
  reykjavik: 'KEF',
  rome: 'FCO',
  rovaniemi: 'RVN',
  singapore: 'SIN',
  salzburg: 'SZG',
  santorini: 'JTR',
  seoul: 'ICN',
  serengeti: 'JRO',
  'siem reap': 'SAI',
  southafrica: 'JNB',
  'south africa': 'JNB',
  southkorea: 'ICN',
  'south korea': 'ICN',
  spain: 'MAD',
  'sri lanka': 'CMB',
  srilanka: 'CMB',
  switzerland: 'ZRH',
  sydney: 'SYD',
  taiwan: 'TPE',
  thailand: 'BKK',
  tallinn: 'TLL',
  tokyo: 'HND',
  tromsø: 'TOS',
  tromso: 'TOS',
  tulum: 'CUN',
  'turks and caicos': 'PLS',
  uae: 'DXB',
  uk: 'LHR',
  unitedarabemirates: 'DXB',
  'united arab emirates': 'DXB',
  unitedkingdom: 'LHR',
  'united kingdom': 'LHR',
  unitedstates: 'JFK',
  'united states': 'JFK',
  usa: 'JFK',
  valletta: 'MLA',
  venice: 'VCE',
  vietnam: 'SGN',
  vienna: 'VIE',
  'wadi rum': 'AQJ',
  whitsundays: 'HTI',
  zanzibar: 'ZNZ',
  zurich: 'ZRH',
};

const AIRLINE_BY_CODE: Record<string, string> = {
  AA: 'American Airlines',
  AC: 'Air Canada',
  AF: 'Air France',
  BA: 'British Airways',
  CX: 'Cathay Pacific',
  DL: 'Delta Air Lines',
  EK: 'Emirates',
  EY: 'Etihad Airways',
  JL: 'Japan Airlines',
  KL: 'KLM',
  LH: 'Lufthansa',
  NH: 'ANA',
  QR: 'Qatar Airways',
  QF: 'Qantas',
  SQ: 'Singapore Airlines',
  TG: 'Thai Airways',
  TK: 'Turkish Airlines',
  UA: 'United Airlines',
  VN: 'Vietnam Airlines',
};

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function resolveAirportCode(value: string) {
  const trimmed = value.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const normalized = normalizeLookup(trimmed);
  if (AIRPORT_BY_PLACE[normalized]) {
    return AIRPORT_BY_PLACE[normalized];
  }

  const match = Object.entries(AIRPORT_BY_PLACE)
    .sort((left, right) => right[0].length - left[0].length)
    .find(([place]) => normalized.includes(place));

  return match?.[1] || null;
}

function formatDuration(totalMinutes?: number) {
  if (!totalMinutes || totalMinutes <= 0) {
    return 'Unknown';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatIsoDuration(duration?: string) {
  if (!duration) {
    return 'Unknown';
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) {
    return 'Unknown';
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function mapAmadeusOffer(option: AmadeusOffer, index: number, currency: string): FlightSearchResult | null {
  const outbound = option.itineraries?.[0];
  const segments = outbound?.segments || [];
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const amount = Number(option.price?.grandTotal || 0);

  if (!firstSegment?.departure?.iataCode || !lastSegment?.arrival?.iataCode || !amount) {
    return null;
  }

  const carrierCode = firstSegment.carrierCode || 'FL';
  const flightNumber = `${carrierCode} ${firstSegment.number || index + 1}`;
  return {
    id: option.id || `${flightNumber}-${index}`,
    airline: AIRLINE_BY_CODE[carrierCode] || carrierCode,
    code: carrierCode,
    flightNumber,
    departTime: firstSegment.departure.at || '',
    arriveTime: lastSegment.arrival?.at || '',
    duration: formatIsoDuration(outbound?.duration),
    price: amount,
    currency: option.price?.currency || currency,
    stops: Math.max(0, segments.length - 1),
    from: firstSegment.departure.iataCode,
    fromCode: firstSegment.departure.iataCode,
    to: lastSegment.arrival?.iataCode || '',
    toCode: lastSegment.arrival?.iataCode || '',
    type: option.itineraries && option.itineraries.length > 1 ? 'Round trip' : 'One way',
  };
}

async function getAmadeusAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.amadeusClientId,
    client_secret: env.amadeusClientSecret,
  });

  const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error('Unable to authenticate with Amadeus sandbox.');
  }

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Amadeus sandbox access token missing.');
  }

  return data.access_token;
}

export async function searchFlightsWithSerpApi(input: {
  from: string;
  to: string;
  outboundDate: string;
  returnDate?: string;
  currency?: string;
  hl?: string;
}) {
  const departureId = resolveAirportCode(input.from);
  const arrivalId = resolveAirportCode(input.to);

  if (!departureId) {
    throw new Error(`Could not resolve a departure airport for "${input.from}".`);
  }
  if (!arrivalId) {
    throw new Error(`Could not resolve an arrival airport for "${input.to}".`);
  }

  if (!env.amadeusClientId || !env.amadeusClientSecret) {
    return {
      flights: makeFallbackFlights(input, departureId, arrivalId),
      departureId,
      arrivalId,
    };
  }

  try {
    const accessToken = await getAmadeusAccessToken();
    const query = new URLSearchParams({
      originLocationCode: departureId,
      destinationLocationCode: arrivalId,
      departureDate: input.outboundDate,
      adults: '1',
      max: '12',
      currencyCode: input.currency || 'USD',
    });

    if (input.returnDate) {
      query.set('returnDate', input.returnDate);
    }

    const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Amadeus sandbox flight search failed.');
    }

    const payload = await response.json() as { data?: AmadeusOffer[] };
    const allOptions = (payload.data || [])
      .map((option, index) => mapAmadeusOffer(option, index, input.currency || 'USD'))
      .filter((option): option is FlightSearchResult => option !== null)
      .slice(0, 12);

    if (allOptions.length === 0) {
      return {
        flights: makeFallbackFlights(input, departureId, arrivalId),
        departureId,
        arrivalId,
      };
    }

    return {
      flights: allOptions,
      departureId,
      arrivalId,
    };
  } catch {
    return {
      flights: makeFallbackFlights(input, departureId, arrivalId),
      departureId,
      arrivalId,
    };
  }
}