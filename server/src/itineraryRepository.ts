import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool, runSchemaUpgrades } from './db';

type ItineraryRow = RowDataPacket & {
  id: number;
  user_id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'confirmed' | 'upcoming' | 'completed';
  created_at: Date;
};

type ItineraryJoinRow = RowDataPacket & {
  itinerary_id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'confirmed' | 'upcoming' | 'completed';
  itinerary_created_at: Date;
  day_id: number | null;
  day_number: number | null;
  item_id: number | null;
  time_slot: string | null;
  notes: string | null;
  image_url: string | null;
  location: string | null;
  price: number | null;
  currency: string | null;
  place_id: number | null;
  place_name: string | null;
  place_external_id: string | null;
};

type ItineraryBookingRow = RowDataPacket & {
  id: number;
  itinerary_id: number | null;
  place_id: number | null;
  place_name: string | null;
  booking_type: 'hotel' | 'flight' | 'restaurant';
  flight_name: string | null;
  hotel_name: string;
  location: string | null;
  check_in: Date | string;
  check_out: Date | string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: string | number;
  currency: string;
  created_at: Date;
};

export interface ItineraryCreateInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
}

function normalizeTripDestination(value: string) {
  return value.trim().toLowerCase();
}

function shouldRetrySchemaUpgrade(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /unknown column|doesn't exist|foreign key constraint/i.test(message);
}

export interface AddItemInput {
  itineraryId?: number;
  itinerary?: ItineraryCreateInput;
  dayNumber?: number;
  timeSlot?: string;
  notes?: string;
  place: {
    externalId?: string;
    name: string;
    type: 'hotel' | 'restaurant' | 'attraction' | 'place';
    location?: string;
    imageUrl?: string;
    rating?: number;
    price?: number;
    currency?: string;
  };
}

export interface ItineraryActivity {
  id: string;
  time: string;
  placeId: string;
  placeName: string;
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

export interface ItineraryDay {
  dayNumber: number;
  activities: ItineraryActivity[];
}

interface ItineraryUpdateInput extends Partial<ItineraryCreateInput> {
  status?: ItineraryRecord['status'];
  days?: Array<{
    dayNumber?: number;
    activities?: Array<{
      time?: string;
      placeId?: string;
      placeName?: string;
      notes?: string;
      imageUrl?: string;
      location?: string;
      price?: number;
      currency?: string;
    }>;
  }>;
}

export interface ItineraryRecord {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'confirmed' | 'upcoming' | 'completed';
  createdAt: string;
  days: ItineraryDay[];
}

function toIsoDate(value: string | Date) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : String(value).slice(0, 10);
}

function addDays(dateValue: string | Date, amount: number) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function normalizeActivityName(activity: NonNullable<ItineraryUpdateInput['days']>[number]['activities'][number]) {
  const explicitName = activity.placeName?.trim();
  if (explicitName) {
    return explicitName;
  }

  const notePrefix = activity.notes?.split(' - ')[0]?.split(' — ')[0]?.trim();
  if (notePrefix) {
    return notePrefix.replace(/^\p{Emoji_Presentation}\s*/u, '');
  }

  return activity.placeId?.trim() || 'Saved place';
}

async function ensureDestination(name: string) {
  const [existing] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM destinations WHERE name = ? LIMIT 1`,
    [name],
  );

  if (existing[0]?.id) {
    return Number(existing[0].id);
  }

  const [inserted] = await pool.execute<ResultSetHeader>(
    `INSERT INTO destinations (name) VALUES (?)`,
    [name],
  );

  return inserted.insertId;
}

async function ensureDay(itineraryId: number, dayNumber: number, dayDate?: string) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM itinerary_days WHERE itinerary_id = ? AND day_number = ? LIMIT 1`,
    [itineraryId, dayNumber],
  );

  if (rows[0]?.id) {
    return Number(rows[0].id);
  }

  const [inserted] = await pool.execute<ResultSetHeader>(
    `INSERT INTO itinerary_days (itinerary_id, day_number, day_date) VALUES (?, ?, ?)`,
    [itineraryId, dayNumber, dayDate ?? null],
  );

  return inserted.insertId;
}

async function ensurePlace(destinationId: number, input: AddItemInput['place']) {
  const normalizedType = input.type || 'place';

  if (input.externalId) {
    const [byExternal] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM places WHERE external_id = ? LIMIT 1`,
      [input.externalId],
    );
    if (byExternal[0]?.id) {
      return Number(byExternal[0].id);
    }
  }

  const [existing] = await pool.execute<RowDataPacket[]>(
    `SELECT id
     FROM places
     WHERE destination_id = ?
       AND name = ?
       AND type = ?
       AND COALESCE(location, '') = COALESCE(?, '')
     LIMIT 1`,
    [destinationId, input.name, normalizedType, input.location ?? null],
  );

  if (existing[0]?.id) {
    return Number(existing[0].id);
  }

  const [inserted] = await pool.execute<ResultSetHeader>(
    `INSERT INTO places (destination_id, external_id, name, type, location, rating, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      destinationId,
      input.externalId ?? null,
      input.name,
      normalizedType,
      input.location ?? null,
      typeof input.rating === 'number' ? input.rating : null,
      input.imageUrl ?? null,
    ],
  );

  return inserted.insertId;
}

export async function createItineraryForUser(userId: number, input: ItineraryCreateInput) {
  const destinationId = await ensureDestination(input.destination);
  const [inserted] = await pool.execute<ResultSetHeader>(
    `INSERT INTO itineraries (user_id, destination_id, title, destination, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
    [
      userId,
      destinationId,
      input.title,
      input.destination,
      input.startDate,
      input.endDate,
    ],
  );

  await ensureDay(inserted.insertId, 1, input.startDate);
  return inserted.insertId;
}

export async function findItineraryByDestinationForUser(userId: number, destination: string) {
  const [rows] = await pool.execute<ItineraryRow[]>(
    `SELECT id, user_id, title, destination, start_date, end_date, status, created_at
     FROM itineraries
     WHERE user_id = ?
       AND LOWER(TRIM(destination)) = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, normalizeTripDestination(destination)],
  );

  return rows[0] ? Number(rows[0].id) : null;
}

export async function findOrCreateItineraryForUserByDestination(userId: number, input: ItineraryCreateInput) {
  const existingId = await findItineraryByDestinationForUser(userId, input.destination);
  if (existingId) {
    return existingId;
  }

  return createItineraryForUser(userId, input);
}

export async function addItemToItinerary(userId: number, input: AddItemInput) {
  let itineraryId = input.itineraryId;

  if (itineraryId) {
    const [owned] = await pool.execute<ItineraryRow[]>(
      `SELECT id, user_id, title, destination, start_date, end_date, status, created_at
       FROM itineraries
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [itineraryId, userId],
    );

    if (!owned[0]) {
      throw new Error('Itinerary not found.');
    }
  } else {
    const now = new Date().toISOString().slice(0, 10);
    const itineraryInput: ItineraryCreateInput = {
      title: input.itinerary?.title || `Trip to ${input.place.location || input.place.name}`,
      destination: input.itinerary?.destination || input.place.location || input.place.name,
      startDate: input.itinerary?.startDate || now,
      endDate: input.itinerary?.endDate || now,
    };
    itineraryId = await createItineraryForUser(userId, itineraryInput);
  }

  const [tripRows] = await pool.execute<RowDataPacket[]>(
    `SELECT destination_id, start_date FROM itineraries WHERE id = ? LIMIT 1`,
    [itineraryId],
  );

  const dayNumber = Math.max(1, Number(input.dayNumber || 1));
  const dayId = await ensureDay(
    itineraryId,
    dayNumber,
    toIsoDate(tripRows[0]?.start_date || new Date()),
  );

  const destinationId = Number(tripRows[0].destination_id);
  const placeId = await ensurePlace(destinationId, input.place);

  const sql = `INSERT INTO itinerary_items (day_id, itinerary_id, place_id, place_name, time_slot, notes, image_url, location, price, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    dayId,
    itineraryId,
    placeId,
    input.place.name,
    input.timeSlot || '09:00',
    input.notes || '',
    input.place.imageUrl || null,
    input.place.location || null,
    typeof input.place.price === 'number' ? input.place.price : 0,
    input.place.currency || 'USD',
  ];

  let inserted: ResultSetHeader;
  try {
    [inserted] = await pool.execute<ResultSetHeader>(sql, params);
  } catch (error) {
    if (!shouldRetrySchemaUpgrade(error)) {
      throw error;
    }

    await runSchemaUpgrades();
    [inserted] = await pool.execute<ResultSetHeader>(sql, params);
  }

  return {
    itineraryId,
    dayId,
    itemId: inserted.insertId,
    placeId,
  };
}

function mapItineraryRows(rows: ItineraryJoinRow[]): ItineraryRecord[] {
  const itineraryMap = new Map<number, ItineraryRecord>();

  for (const row of rows) {
    if (!itineraryMap.has(row.itinerary_id)) {
      itineraryMap.set(row.itinerary_id, {
        id: String(row.itinerary_id),
        userId: String(row.user_id),
        userName: row.user_name || undefined,
        userEmail: row.user_email || undefined,
        title: row.title,
        destination: row.destination,
        startDate: toIsoDate(row.start_date),
        endDate: toIsoDate(row.end_date),
        status: row.status,
        createdAt: new Date(row.itinerary_created_at).toISOString(),
        days: [],
      });
    }

    const itinerary = itineraryMap.get(row.itinerary_id)!;
    if (!row.day_id || row.day_number == null) {
      continue;
    }

    let day = itinerary.days.find((d) => d.dayNumber === row.day_number);
    if (!day) {
      day = { dayNumber: row.day_number, activities: [] };
      itinerary.days.push(day);
    }

    if (!row.item_id || !row.place_id) {
      continue;
    }

    day.activities.push({
      id: String(row.item_id),
      time: row.time_slot || '09:00',
      placeId: row.place_external_id || String(row.place_id),
      placeName: row.place_name || row.place_external_id || String(row.place_id),
      notes: row.notes || '',
      imageUrl: row.image_url || undefined,
      location: row.location || undefined,
      price: row.price != null ? Number(row.price) : undefined,
      currency: row.currency || undefined,
    });
  }

  return Array.from(itineraryMap.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function formatDateOnly(value: Date | string) {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function attachBookingsToItineraries(itineraries: ItineraryRecord[], input: { userId?: number; isAdmin?: boolean }) {
  if (itineraries.length === 0) {
    return itineraries;
  }

  const itineraryIds = itineraries.map((item) => Number(item.id)).filter((item) => Number.isInteger(item) && item > 0);
  if (itineraryIds.length === 0) {
    return itineraries;
  }

  const placeholders = itineraryIds.map(() => '?').join(', ');
  const where = input.isAdmin
    ? `b.itinerary_id IN (${placeholders})`
    : `b.user_id = ? AND b.itinerary_id IN (${placeholders})`;
  const params = input.isAdmin ? itineraryIds : [input.userId!, ...itineraryIds];

  const [rows] = await pool.execute<ItineraryBookingRow[]>(
    `SELECT
       b.id,
       b.itinerary_id,
       b.place_id,
       b.place_name,
       b.booking_type,
       b.flight_name,
       b.hotel_name,
       b.location,
       b.check_in,
       b.check_out,
       b.guests,
       b.status,
       b.total_price,
       b.currency,
       b.created_at
     FROM bookings b
     WHERE ${where}
     ORDER BY b.created_at DESC`,
    params,
  );

  const bookingsByItinerary = new Map<number, ItineraryBookingRow[]>();
  for (const row of rows) {
    if (!row.itinerary_id) {
      continue;
    }
    const existing = bookingsByItinerary.get(row.itinerary_id) || [];
    existing.push(row);
    bookingsByItinerary.set(row.itinerary_id, existing);
  }

  for (const itinerary of itineraries) {
    const itineraryBookings = bookingsByItinerary.get(Number(itinerary.id)) || [];
    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        const matches = itineraryBookings.filter((booking) => {
          if (booking.place_name && activity.placeName) {
            return booking.place_name.trim().toLowerCase() === activity.placeName.trim().toLowerCase();
          }
          if (booking.place_id && activity.placeId) {
            return booking.place_id.toString() === activity.placeId;
          }
          return false;
        });

        if (matches.length > 0) {
          activity.bookings = matches.map((booking) => ({
            id: String(booking.id),
            placeId: booking.place_id ? String(booking.place_id) : undefined,
            placeName: booking.place_name || undefined,
            bookingType: booking.booking_type,
            flightName: booking.flight_name || undefined,
            hotelName: booking.hotel_name,
            location: booking.location || undefined,
            checkIn: formatDateOnly(booking.check_in),
            checkOut: formatDateOnly(booking.check_out),
            guests: Number(booking.guests),
            status: booking.status,
            totalPrice: Number(booking.total_price),
            currency: booking.currency,
          }));
        }
      }
    }
  }

  return itineraries;
}

export async function listItinerariesByUser(userId: number) {
  const query = `SELECT
       i.id AS itinerary_id,
       i.user_id,
        NULL AS user_name,
        NULL AS user_email,
       i.title,
       i.destination,
       i.start_date,
       i.end_date,
       i.status,
       i.created_at AS itinerary_created_at,
       d.id AS day_id,
       d.day_number,
       it.id AS item_id,
       it.time_slot,
       it.notes,
       it.image_url,
       it.location,
       it.price,
       it.currency,
       it.place_id,
       COALESCE(it.place_name, p.name) AS place_name,
       p.external_id AS place_external_id
     FROM itineraries i
     LEFT JOIN itinerary_days d ON d.itinerary_id = i.id
     LEFT JOIN itinerary_items it ON it.day_id = d.id
     LEFT JOIN places p ON p.id = it.place_id
     WHERE i.user_id = ?
     ORDER BY i.created_at DESC, d.day_number ASC, it.id ASC`;

  let rows: ItineraryJoinRow[];
  try {
    [rows] = await pool.execute<ItineraryJoinRow[]>(query, [userId]);
  } catch (error) {
    if (!shouldRetrySchemaUpgrade(error)) {
      throw error;
    }

    await runSchemaUpgrades();
    [rows] = await pool.execute<ItineraryJoinRow[]>(query, [userId]);
  }

  return attachBookingsToItineraries(mapItineraryRows(rows), { userId });
}

export async function listAllItinerariesForAdmin() {
  const query = `SELECT
       i.id AS itinerary_id,
       i.user_id,
        u.name AS user_name,
        u.email AS user_email,
       i.title,
       i.destination,
       i.start_date,
       i.end_date,
       i.status,
       i.created_at AS itinerary_created_at,
       d.id AS day_id,
       d.day_number,
       it.id AS item_id,
       it.time_slot,
       it.notes,
       it.image_url,
       it.location,
       it.price,
       it.currency,
       it.place_id,
       COALESCE(it.place_name, p.name) AS place_name,
       p.external_id AS place_external_id
     FROM itineraries i
    LEFT JOIN users u ON u.id = i.user_id
     LEFT JOIN itinerary_days d ON d.itinerary_id = i.id
     LEFT JOIN itinerary_items it ON it.day_id = d.id
     LEFT JOIN places p ON p.id = it.place_id
     ORDER BY i.created_at DESC, d.day_number ASC, it.id ASC`;

  let rows: ItineraryJoinRow[];
  try {
    [rows] = await pool.execute<ItineraryJoinRow[]>(query);
  } catch (error) {
    if (!shouldRetrySchemaUpgrade(error)) {
      throw error;
    }

    await runSchemaUpgrades();
    [rows] = await pool.execute<ItineraryJoinRow[]>(query);
  }

  return attachBookingsToItineraries(mapItineraryRows(rows), { isAdmin: true });
}

export async function updateItineraryById(userId: number, itineraryId: number, input: ItineraryUpdateInput) {
  const [existingRows] = await pool.execute<ItineraryRow[]>(
    `SELECT id, user_id, title, destination, start_date, end_date, status, created_at
     FROM itineraries
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [itineraryId, userId],
  );

  const existing = existingRows[0];
  if (!existing) {
    throw new Error('Itinerary not found.');
  }

  const fields: string[] = [];
  const values: Array<string | number> = [];

  if (typeof input.title === 'string') {
    fields.push('title = ?');
    values.push(input.title);
  }
  if (typeof input.destination === 'string') {
    const destinationId = await ensureDestination(input.destination);
    fields.push('destination_id = ?');
    values.push(destinationId);
    fields.push('destination = ?');
    values.push(input.destination);
  }
  if (typeof input.startDate === 'string') {
    fields.push('start_date = ?');
    values.push(input.startDate);
  }
  if (typeof input.endDate === 'string') {
    fields.push('end_date = ?');
    values.push(input.endDate);
  }
  if (typeof input.status === 'string') {
    fields.push('status = ?');
    values.push(input.status);
  }

  if (fields.length === 0 && !Array.isArray(input.days)) {
    return;
  }

  if (fields.length > 0) {
    values.push(itineraryId, userId);
    await pool.execute(
      `UPDATE itineraries SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values,
    );
  }

  if (!Array.isArray(input.days)) {
    return;
  }

  const startDate = input.startDate || toIsoDate(existing.start_date);
  const destination = input.destination || existing.destination;

  await pool.execute(`DELETE FROM itinerary_days WHERE itinerary_id = ?`, [itineraryId]);

  const sortedDays = [...input.days]
    .filter((day) => Number.isFinite(Number(day.dayNumber)) && Number(day.dayNumber) > 0)
    .sort((left, right) => Number(left.dayNumber) - Number(right.dayNumber));

  for (const dayInput of sortedDays) {
    const dayNumber = Math.max(1, Number(dayInput.dayNumber || 1));
    const dayDate = addDays(startDate, dayNumber - 1) || startDate;
    const dayId = await ensureDay(itineraryId, dayNumber, dayDate);

    for (const activity of dayInput.activities || []) {
      const placeName = normalizeActivityName(activity);
      const placeId = await ensurePlace(await ensureDestination(destination), {
        externalId: activity.placeId && /^\d+$/.test(activity.placeId) ? undefined : activity.placeId,
        name: placeName,
        type: 'place',
        location: activity.location || destination,
        imageUrl: activity.imageUrl,
        price: typeof activity.price === 'number' && Number.isFinite(activity.price) ? activity.price : undefined,
        currency: activity.currency,
      });

      await pool.execute(
        `INSERT INTO itinerary_items (day_id, itinerary_id, place_id, place_name, time_slot, notes, image_url, location, price, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dayId,
          itineraryId,
          placeId,
          placeName,
          activity.time || '09:00',
          activity.notes || '',
          activity.imageUrl || null,
          activity.location || destination,
          typeof activity.price === 'number' && Number.isFinite(activity.price) ? activity.price : 0,
          activity.currency || 'USD',
        ],
      );
    }
  }
}

export async function deleteItineraryById(userId: number, itineraryId: number) {
  await pool.execute(
    `DELETE FROM itineraries WHERE id = ? AND user_id = ?`,
    [itineraryId, userId],
  );
}

export async function deleteItineraryAsAdmin(itineraryId: number) {
  await pool.execute(`DELETE FROM itineraries WHERE id = ?`, [itineraryId]);
}
