import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db';

export type ContactMessageRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  topic: string;
  destination: string;
  startDate: string;
  endDate: string;
  message: string;
  status: 'new' | 'replied';
  reply?: string;
  repliedAt?: string;
  createdAt: string;
};

type ContactMessageRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  email: string;
  topic: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  message_body: string;
  status: 'new' | 'replied';
  reply_text: string | null;
  replied_at: Date | null;
  created_at: Date;
};

function mapContactMessage(row: ContactMessageRow): ContactMessageRecord {
  return {
    id: `TCK-${row.id}`,
    userId: String(row.user_id),
    name: row.name,
    email: row.email,
    topic: row.topic,
    destination: row.destination ?? '',
    startDate: row.start_date ?? '',
    endDate: row.end_date ?? '',
    message: row.message_body,
    status: row.status,
    reply: row.reply_text ?? undefined,
    repliedAt: row.replied_at ? row.replied_at.toISOString() : undefined,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listContactMessages() {
  const [rows] = await pool.execute<ContactMessageRow[]>(`
    SELECT id, user_id, name, email, topic, destination, start_date, end_date, message_body, status, reply_text, replied_at, created_at
    FROM contact_messages
    ORDER BY created_at DESC
  `);

  return rows.map(mapContactMessage);
}

export async function listContactMessagesByUser(userId: number) {
  const [rows] = await pool.execute<ContactMessageRow[]>(`
    SELECT id, user_id, name, email, topic, destination, start_date, end_date, message_body, status, reply_text, replied_at, created_at
    FROM contact_messages
    WHERE user_id = ?
    ORDER BY created_at DESC
  `, [userId]);

  return rows.map(mapContactMessage);
}

export async function createContactMessage(input: {
  userId: number;
  name: string;
  email: string;
  topic: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  message: string;
}) {
  const [result] = await pool.execute<ResultSetHeader>(`
    INSERT INTO contact_messages (user_id, name, email, topic, destination, start_date, end_date, message_body, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `, [
    input.userId,
    input.name,
    input.email,
    input.topic,
    input.destination || null,
    input.startDate || null,
    input.endDate || null,
    input.message,
  ]);

  const [rows] = await pool.execute<ContactMessageRow[]>(`
    SELECT id, user_id, name, email, topic, destination, start_date, end_date, message_body, status, reply_text, replied_at, created_at
    FROM contact_messages
    WHERE id = ?
    LIMIT 1
  `, [result.insertId]);

  return rows[0] ? mapContactMessage(rows[0]) : null;
}

export async function replyToContactMessage(id: number, reply: string) {
  await pool.execute(`
    UPDATE contact_messages
    SET status = 'replied', reply_text = ?, replied_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [reply, id]);
}

export async function updateContactMessageStatus(id: number, status: 'new' | 'replied') {
  await pool.execute(`
    UPDATE contact_messages
    SET status = ?, replied_at = CASE WHEN ? = 'replied' THEN COALESCE(replied_at, CURRENT_TIMESTAMP) ELSE NULL END
    WHERE id = ?
  `, [status, status, id]);
}

export async function deleteContactMessage(id: number) {
  await pool.execute(`DELETE FROM contact_messages WHERE id = ?`, [id]);
}

export function parseTicketId(ticketId: string) {
  return Number(ticketId.replace(/^TCK-/, ''));
}
