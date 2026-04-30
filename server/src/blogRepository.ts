import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from './db';

type BlogRow = RowDataPacket & {
  id: number;
  user_id: number;
  author_name: string;
  user_name: string | null;
  user_profile_image: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  tags_json: string | null;
  status: 'pending' | 'approved';
  approved_by: number | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export interface BlogPostRecord {
  id: string;
  userId: string;
  authorName: string;
  authorProfileImage?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string[];
  status: 'pending' | 'approved';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(title: string) {
  const base = slugify(title) || 'post';
  let slug = base;
  let suffix = 2;

  for (;;) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM blog_posts WHERE slug = ? LIMIT 1`,
      [slug],
    );

    if (!rows[0]) {
      return slug;
    }

    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function mapBlogRow(row: BlogRow): BlogPostRecord {
  let tags: string[] = [];
  if (row.tags_json) {
    try {
      const parsed = JSON.parse(row.tags_json);
      if (Array.isArray(parsed)) {
        tags = parsed.filter((tag) => typeof tag === 'string');
      }
    } catch {
      tags = [];
    }
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    authorName: row.user_name || row.author_name,
    authorProfileImage: row.user_profile_image || undefined,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    coverImage: row.cover_image || undefined,
    tags,
    status: row.status,
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function createPendingBlogPost(input: {
  userId: number;
  authorName: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags?: string[];
}) {
  const slug = await generateUniqueSlug(input.title);

  const [inserted] = await pool.execute<ResultSetHeader>(
    `INSERT INTO blog_posts
      (user_id, author_name, title, slug, excerpt, content, cover_image, tags_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      input.userId,
      input.authorName,
      input.title,
      slug,
      input.excerpt,
      input.content,
      input.coverImage || null,
      JSON.stringify(input.tags || []),
    ],
  );

  return findBlogPostById(inserted.insertId);
}

export async function listApprovedBlogPosts() {
  const [rows] = await pool.execute<BlogRow[]>(
    `SELECT bp.id, bp.user_id, bp.author_name, u.name AS user_name, u.profile_image AS user_profile_image,
            bp.title, bp.slug, bp.excerpt, bp.content, bp.cover_image, bp.tags_json,
            bp.status, bp.approved_by, bp.approved_at, bp.created_at, bp.updated_at
     FROM blog_posts bp
     LEFT JOIN users u ON u.id = bp.user_id
     WHERE status = 'approved'
     ORDER BY bp.created_at DESC`,
  );

  return rows.map(mapBlogRow);
}

export async function listBlogPostsForAdmin() {
  const [rows] = await pool.execute<BlogRow[]>(
    `SELECT bp.id, bp.user_id, bp.author_name, u.name AS user_name, u.profile_image AS user_profile_image,
            bp.title, bp.slug, bp.excerpt, bp.content, bp.cover_image, bp.tags_json,
            bp.status, bp.approved_by, bp.approved_at, bp.created_at, bp.updated_at
     FROM blog_posts bp
     LEFT JOIN users u ON u.id = bp.user_id
     ORDER BY bp.created_at DESC`,
  );

  return rows.map(mapBlogRow);
}

export async function listBlogPostsByUser(userId: number) {
  const [rows] = await pool.execute<BlogRow[]>(
    `SELECT bp.id, bp.user_id, bp.author_name, u.name AS user_name, u.profile_image AS user_profile_image,
            bp.title, bp.slug, bp.excerpt, bp.content, bp.cover_image, bp.tags_json,
            bp.status, bp.approved_by, bp.approved_at, bp.created_at, bp.updated_at
     FROM blog_posts bp
     LEFT JOIN users u ON u.id = bp.user_id
     WHERE bp.user_id = ?
     ORDER BY bp.created_at DESC`,
    [userId],
  );

  return rows.map(mapBlogRow);
}

export async function findApprovedBlogPostBySlug(slug: string) {
  const [rows] = await pool.execute<BlogRow[]>(
    `SELECT bp.id, bp.user_id, bp.author_name, u.name AS user_name, u.profile_image AS user_profile_image,
            bp.title, bp.slug, bp.excerpt, bp.content, bp.cover_image, bp.tags_json,
            bp.status, bp.approved_by, bp.approved_at, bp.created_at, bp.updated_at
     FROM blog_posts bp
     LEFT JOIN users u ON u.id = bp.user_id
     WHERE bp.slug = ? AND bp.status = 'approved'
     LIMIT 1`,
    [slug],
  );

  return rows[0] ? mapBlogRow(rows[0]) : null;
}

export async function findBlogPostById(id: number) {
  const [rows] = await pool.execute<BlogRow[]>(
    `SELECT bp.id, bp.user_id, bp.author_name, u.name AS user_name, u.profile_image AS user_profile_image,
            bp.title, bp.slug, bp.excerpt, bp.content, bp.cover_image, bp.tags_json,
            bp.status, bp.approved_by, bp.approved_at, bp.created_at, bp.updated_at
     FROM blog_posts bp
     LEFT JOIN users u ON u.id = bp.user_id
     WHERE bp.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapBlogRow(rows[0]) : null;
}

export async function updateBlogPostById(input: {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags?: string[];
}) {
  const current = await findBlogPostById(input.id);
  if (!current) {
    return null;
  }

  const nextSlug = current.title === input.title ? current.slug : await generateUniqueSlug(input.title);

  await pool.execute(
    `UPDATE blog_posts
     SET title = ?,
         slug = ?,
         excerpt = ?,
         content = ?,
         cover_image = ?,
         tags_json = ?,
         status = 'pending',
         approved_by = NULL,
         approved_at = NULL
     WHERE id = ?`,
    [
      input.title,
      nextSlug,
      input.excerpt,
      input.content,
      input.coverImage || null,
      JSON.stringify(input.tags || []),
      input.id,
    ],
  );

  return findBlogPostById(input.id);
}

export async function approveBlogPost(id: number, approvedBy: number) {
  await pool.execute(
    `UPDATE blog_posts
     SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [approvedBy, id],
  );
}

export async function deleteBlogPost(id: number) {
  await pool.execute(`DELETE FROM blog_posts WHERE id = ?`, [id]);
}
