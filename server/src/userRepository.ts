import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db';
import { normalizeEmail, normalizeName } from './sanitize';
import { SafeUser, UserRecord } from './types';

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  phone: string | null;
  profile_image: string | null;
  created_at: Date;
  updated_at: Date;
  is_active: number;
};

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    uid: String(row.id),
    email: row.email,
    displayName: row.name,
    name: row.name,
    role: row.role,
    phone: row.phone,
    profileImage: row.profile_image,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    passwordHash: row.password_hash,
    isActive: Boolean(row.is_active),
  };
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    uid: String(user.id),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    phone: user.phone ?? null,
    profileImage: user.profileImage ?? null,
    createdAt: user.createdAt,
  };
}

export async function findUserByEmail(email: string) {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, password_hash, role, phone, profile_image, created_at, updated_at, is_active
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizeEmail(email)],
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: number) {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, password_hash, role, phone, profile_image, created_at, updated_at, is_active
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser(input: { name: string; email: string; passwordHash: string; role?: 'user' | 'admin' }) {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)`,
    [normalizeName(input.name), normalizeEmail(input.email), input.passwordHash, input.role ?? 'user'],
  );

  return findUserById(result.insertId);
}

export async function updateLastLoginAt(id: number) {
  await pool.execute(
    `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id],
  );
}

export async function updateUserProfile(id: number, input: { name: string; email: string; phone?: string; profileImage?: string }) {
  await pool.execute(
    `UPDATE users
     SET name = ?, email = ?, phone = ?, profile_image = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      normalizeName(input.name),
      normalizeEmail(input.email),
      input.phone || null,
      input.profileImage || null,
      id,
    ],
  );

  return findUserById(id);
}

export async function updateUserPassword(id: number, passwordHash: string) {
  await pool.execute(
    `UPDATE users
     SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [passwordHash, id],
  );
}

export async function listUsers() {
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT id, name, email, password_hash, role, phone, profile_image, created_at, updated_at, is_active
     FROM users
     ORDER BY created_at DESC`,
  );

  return rows.map((row) => toSafeUser(mapUser(row)));
}

export async function deleteUserById(id: number) {
  await pool.execute(`DELETE FROM users WHERE id = ?`, [id]);
}
