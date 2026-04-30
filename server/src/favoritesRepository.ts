import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db';

export type FavoriteRecord = {
  id: string;
  title: string;
  city: string;
  country: string;
  imageUrl: string;
  price: number;
  currency: string;
  rating: number;
  propertyType: string;
  savedAt: string;
};

type FavoriteRow = RowDataPacket & {
  item_id: string;
  title: string;
  city: string;
  country: string;
  image_url: string;
  price: string | number;
  currency: string;
  rating: string | number;
  property_type: string;
  saved_at: Date;
};

function mapFavorite(row: FavoriteRow): FavoriteRecord {
  return {
    id: row.item_id,
    title: row.title,
    city: row.city,
    country: row.country,
    imageUrl: row.image_url,
    price: Number(row.price),
    currency: row.currency,
    rating: Number(row.rating),
    propertyType: row.property_type,
    savedAt: row.saved_at.toISOString(),
  };
}

export async function listFavoritesByUser(userId: number) {
  const [rows] = await pool.execute<FavoriteRow[]>(`
    SELECT item_id, title, city, country, image_url, price, currency, rating, property_type, saved_at
    FROM favorites
    WHERE user_id = ?
    ORDER BY saved_at DESC
  `, [userId]);

  return rows.map(mapFavorite);
}

export async function saveFavorite(userId: number, input: Omit<FavoriteRecord, 'savedAt'>) {
  await pool.execute<ResultSetHeader>(`
    INSERT INTO favorites (user_id, item_id, title, city, country, image_url, price, currency, rating, property_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      city = VALUES(city),
      country = VALUES(country),
      image_url = VALUES(image_url),
      price = VALUES(price),
      currency = VALUES(currency),
      rating = VALUES(rating),
      property_type = VALUES(property_type)
  `, [
    userId,
    input.id,
    input.title,
    input.city,
    input.country,
    input.imageUrl,
    input.price,
    input.currency,
    input.rating,
    input.propertyType,
  ]);
}

export async function removeFavorite(userId: number, itemId: string) {
  await pool.execute(`DELETE FROM favorites WHERE user_id = ? AND item_id = ?`, [userId, itemId]);
}
