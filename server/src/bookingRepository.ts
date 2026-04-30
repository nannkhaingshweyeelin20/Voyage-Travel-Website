import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool, runSchemaUpgrades } from './db';

type BookingRow = RowDataPacket & {
  id: number;
  user_id: number;
  itinerary_id: number | null;
  place_id: number | null;
  place_name: string | null;
  booking_type: 'hotel' | 'flight' | 'restaurant';
  flight_name: string | null;
  hotel_name: string;
  location: string | null;
  image_url: string | null;
  check_in: Date | string;
  check_out: Date | string;
  guests: number;
  flight_details_json: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  total_price: string | number;
  currency: string;
  created_at: Date;
  updated_at: Date;
};

export interface BookingRecord {
  id: string;
  userId: string;
  itineraryId?: string;
  placeId?: string;
  placeName?: string;
  bookingType: 'hotel' | 'flight' | 'restaurant';
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
  updatedAt: string;
}

function formatDateOnly(value: Date | string) {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function mapBookingRow(row: BookingRow): BookingRecord {
  let flightDetails: BookingRecord['flightDetails'];
  if (row.flight_details_json) {
    try {
      const parsed = JSON.parse(row.flight_details_json);
      if (parsed && typeof parsed === 'object') {
        flightDetails = parsed;
      }
    } catch {
      flightDetails = undefined;
    }
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    itineraryId: row.itinerary_id ? String(row.itinerary_id) : undefined,
    placeId: row.place_id ? String(row.place_id) : undefined,
    placeName: row.place_name || undefined,
    bookingType: row.booking_type || 'hotel',
    flightName: row.flight_name || undefined,
    hotelName: row.hotel_name,
    location: row.location || undefined,
    imageUrl: row.image_url || undefined,
    checkIn: formatDateOnly(row.check_in),
    checkOut: formatDateOnly(row.check_out),
    guests: Number(row.guests),
    flightDetails,
    status: row.status,
    totalPrice: Number(row.total_price),
    currency: row.currency,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function shouldRetrySchemaUpgrade(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /unknown column|doesn't exist|foreign key constraint/i.test(message);
}

export async function createBookingForUser(input: {
  userId: number;
  itineraryId?: number;
  placeId?: number;
  placeName?: string;
  bookingType?: 'hotel' | 'flight' | 'restaurant';
  flightName?: string;
  hotelName: string;
  location?: string;
  imageUrl?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  flightDetails?: BookingRecord['flightDetails'];
  totalPrice: number;
  currency: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
}) {
  const sql = `INSERT INTO bookings
      (user_id, itinerary_id, place_id, place_name, booking_type, flight_name, hotel_name, location, image_url, check_in, check_out, guests, flight_details_json, status, total_price, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    input.userId,
    input.itineraryId || null,
    input.placeId || null,
    input.placeName || null,
    input.bookingType || 'hotel',
    input.flightName || null,
    input.hotelName,
    input.location || null,
    input.imageUrl || null,
    input.checkIn,
    input.checkOut,
    input.guests,
    input.flightDetails ? JSON.stringify(input.flightDetails) : null,
    input.status || 'confirmed',
    input.totalPrice,
    input.currency,
  ];

  let result: ResultSetHeader;
  try {
    [result] = await pool.execute<ResultSetHeader>(sql, params);
  } catch (error) {
    if (!shouldRetrySchemaUpgrade(error)) {
      throw error;
    }

    await runSchemaUpgrades();
    [result] = await pool.execute<ResultSetHeader>(sql, params);
  }

  return findBookingById(result.insertId);
}

export async function findBookingById(id: number) {
  const [rows] = await pool.execute<BookingRow[]>(
    `SELECT * FROM bookings WHERE id = ? LIMIT 1`,
    [id],
  );

  return rows[0] ? mapBookingRow(rows[0]) : null;
}

export async function listBookingsForAdmin() {
  const [rows] = await pool.execute<BookingRow[]>(
    `SELECT * FROM bookings ORDER BY created_at DESC`,
  );

  return rows.map(mapBookingRow);
}

export async function listBookingsByUser(userId: number) {
  const [rows] = await pool.execute<BookingRow[]>(
    `SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );

  return rows.map(mapBookingRow);
}

export async function updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'cancelled') {
  await pool.execute(
    `UPDATE bookings SET status = ? WHERE id = ?`,
    [status, id],
  );
}