import React, { useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { blogService, BlogPost } from '../lib/services';
import { ApiError } from '../lib/api';

function slugify(title: string): string {
  return title.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

import {
  Search, Clock, ArrowRight, BookOpen, Tag, TrendingUp,
  Globe, Compass, Utensils, Camera, Mountain, Palmtree, Map, MapPin,
  Plus, X, Loader2, AlertCircle, CheckCircle2, Trash2, Pencil, ChevronLeft, ChevronRight
} from 'lucide-react';

type BlogFormField = 'title' | 'excerpt' | 'content' | 'coverImage' | 'tags';

const BLOG_PAGE_SIZE = 2;

function formatBlogDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} min read`;
}

function categoryFromTags(tags: string[]) {
  const normalized = tags.map((tag) => tag.toLowerCase());
  if (normalized.some((tag) => ['food', 'restaurant', 'cuisine'].includes(tag))) return 'Food';
  if (normalized.some((tag) => ['beach', 'islands', 'island'].includes(tag))) return 'Beaches';
  if (normalized.some((tag) => ['photo', 'photography', 'camera'].includes(tag))) return 'Photography';
  if (normalized.some((tag) => ['adventure', 'hiking', 'trek', 'wildlife', 'safari'].includes(tag))) return 'Adventure';
  if (normalized.some((tag) => ['city', 'urban', 'guide'].includes(tag))) return 'City';
  return 'Guides';
}

function avatarFromSeed(seed: string) {
  return `https://i.pravatar.cc/80?u=${encodeURIComponent(seed)}`;
}

function fallbackCover(title: string) {
  const palette = ['0f172a', '312e81', '0f766e', '7c2d12', '334155'];
  const index = title.length % palette.length;
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80&sig=${index + 1}`;
}

/* ── Data ─────────────────────────────────────────────── */
const CATEGORIES = [
  { label: 'All',        icon: Globe },
  { label: 'Guides',     icon: Map },
  { label: 'Food',       icon: Utensils },
  { label: 'Adventure',  icon: Mountain },
  { label: 'Beaches',    icon: Palmtree },
  { label: 'Photography',icon: Camera },
  { label: 'City',       icon: Compass },
];

interface Article {
  id: number | string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  author: string;
  authorAvatar: string;
  date: string;
  readTime: string;
  featured?: boolean;
  tags: string[];
  slug?: string;
  content?: string;
  status?: BlogPost['status'];
  isUserGenerated?: boolean;
}

function mapBlogPostToArticle(post: BlogPost): Article {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    category: categoryFromTags(post.tags),
    image: post.coverImage || fallbackCover(post.title),
    author: post.authorName,
    authorAvatar: post.authorProfileImage || avatarFromSeed(post.authorName || post.userId),
    date: formatBlogDate(post.createdAt),
    readTime: estimateReadTime(post.content),
    tags: post.tags,
    slug: post.slug,
    content: post.content,
    status: post.status,
    isUserGenerated: true,
  };
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: '10 Hidden Gems in Southeast Asia You Must Visit in 2026',
    excerpt: 'Beyond the tourist trails — discover secret beaches, jungle temples, and night markets that most travelers never find. From misty highlands in northern Vietnam to forgotten islands in the Philippines.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    author: 'Maya Tanaka',
    authorAvatar: 'https://i.pravatar.cc/40?img=5',
    date: 'Apr 12, 2026',
    readTime: '8 min read',
    featured: true,
    tags: ['Asia', 'Budget', 'Off-the-beaten-path'],
  },
  {
    id: 2,
    title: 'The Ultimate Tokyo Food Tour: 48 Hours of Epic Eating',
    excerpt: 'From Tsukiji breakfast sushi to midnight ramen in Shinjuku — a food lover\'s guide to eating your way across Japan\'s electric capital.',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
    author: 'James Lee',
    authorAvatar: 'https://i.pravatar.cc/40?img=11',
    date: 'Apr 8, 2026',
    readTime: '6 min read',
    tags: ['Japan', 'Food', 'Tokyo'],
  },
  {
    id: 3,
    title: 'Bali on a Budget: How to Live Like Royalty for $50/Day',
    excerpt: 'Luxury villas, stunning rice terraces, and world-class sunsets — Bali delivers paradise without breaking the bank. Here is exactly how to do it.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
    author: 'Sofia Reyes',
    authorAvatar: 'https://i.pravatar.cc/40?img=9',
    date: 'Apr 3, 2026',
    readTime: '7 min read',
    tags: ['Bali', 'Budget', 'Indonesia'],
  },
  {
    id: 4,
    title: 'Chasing the Northern Lights: Iceland Winter Photography Guide',
    excerpt: 'Capturing the aurora borealis requires patience, the right gear, and knowing exactly where to stand. A professional photographer shares every secret.',
    category: 'Photography',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=900&q=80',
    author: 'Erik Thorvald',
    authorAvatar: 'https://i.pravatar.cc/40?img=3',
    date: 'Mar 28, 2026',
    readTime: '10 min read',
    tags: ['Iceland', 'Photography', 'Winter'],
  },
  {
    id: 5,
    title: 'The World\'s Most Breathtaking Beaches for 2026',
    excerpt: 'Pink sands, turquoise lagoons, and deserted coves — ranking the most spectacular coastlines on the planet, from Maldives to the Azores.',
    category: 'Beaches',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    author: 'Priya Mehta',
    authorAvatar: 'https://i.pravatar.cc/40?img=47',
    date: 'Mar 22, 2026',
    readTime: '5 min read',
    tags: ['Beach', 'Luxury', 'Islands'],
  },
  {
    id: 6,
    title: 'Hiking the Inca Trail: What No Guide Will Tell You',
    excerpt: 'After three permits, two altitude-sick nights, and one life-changing sunrise at Machu Picchu — here is the honest truth about the world\'s most famous trek.',
    category: 'Adventure',
    image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=900&q=80',
    author: 'Carlos Mendez',
    authorAvatar: 'https://i.pravatar.cc/40?img=13',
    date: 'Mar 15, 2026',
    readTime: '12 min read',
    tags: ['Peru', 'Hiking', 'Adventure'],
  },
  {
    id: 7,
    title: 'Paris Beyond the Eiffel Tower: A Local\'s City Guide',
    excerpt: 'Skip the queues and discover the arrondissements where Parisians actually eat, drink, and spend their weekends — from Le Marais to Canal Saint-Martin.',
    category: 'City',
    image: 'https://images.unsplash.com/photo-1431274172761-fcdab704a698?auto=format&fit=crop&w=900&q=80',
    author: 'Isabelle Dubois',
    authorAvatar: 'https://i.pravatar.cc/40?img=26',
    date: 'Mar 10, 2026',
    readTime: '9 min read',
    tags: ['Paris', 'City', 'Europe'],
  },
  {
    id: 8,
    title: 'Safari Dreams: A First-Timer\'s Guide to East Africa',
    excerpt: 'Witnessing the Great Migration changed my life. Everything you need to know before your first African safari — parks, seasons, costs, and what to pack.',
    category: 'Adventure',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80',
    author: 'David Osei',
    authorAvatar: 'https://i.pravatar.cc/40?img=33',
    date: 'Mar 5, 2026',
    readTime: '11 min read',
    tags: ['Africa', 'Safari', 'Wildlife'],
  },
  {
    id: 9,
    title: 'Street Food Capital: Singapore\'s Hawker Culture Explained',
    excerpt: 'UNESCO heritage, Michelin stars, and $3 chicken rice — Singapore\'s hawker centres are the greatest food courts on earth. Here is your complete guide.',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=900&q=80',
    author: 'Wei Lin',
    authorAvatar: 'https://i.pravatar.cc/40?img=41',
    date: 'Feb 28, 2026',
    readTime: '6 min read',
    tags: ['Singapore', 'Food', 'Culture'],
  },
];

const TRENDING = [
  { title: 'Is Airbnb Still Worth It in 2026?', time: '4 min read', tag: 'Travel Tips' },
  { title: 'Best Travel Credit Cards This Year', time: '5 min read', tag: 'Finance' },
  { title: 'How to Travel Solo as a Woman Safely', time: '8 min read', tag: 'Solo Travel' },
  { title: 'Digital Nomad Visa Countries Ranked', time: '7 min read', tag: 'Remote Work' },
];

interface RecommendedPlace {
  country: string;
  city: string;
  description: string;
  image: string;
  tag: string;
}

const RECOMMENDED_PLACES: RecommendedPlace[] = [
  {
    country: 'Japan',
    city: 'Tokyo',
    description: 'A dizzying blend of neon-lit modernity and ancient shrines. Eat world-class sushi, explore robot restaurants, and lose yourself in cherry blossom season.',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
    tag: 'Asia',
  },
  {
    country: 'Italy',
    city: 'Rome',
    description: 'The Eternal City layers 3,000 years of history under open sky. From the Colosseum to Vatican City, every corner is a postcard.',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80',
    tag: 'Europe',
  },
  {
    country: 'France',
    city: 'Paris',
    description: 'Art, fashion, gastronomy, and the most romantic skyline on earth. The City of Light never stops inspiring.',
    image: 'https://images.unsplash.com/photo-1431274172761-fcdab704a698?auto=format&fit=crop&w=900&q=80',
    tag: 'Europe',
  },
  {
    country: 'Thailand',
    city: 'Bangkok',
    description: 'Soaring temples, chaotic night markets, and street food that rivals any Michelin restaurant. Bangkok rewards the adventurous palate.',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=80',
    tag: 'Asia',
  },
  {
    country: 'Indonesia',
    city: 'Bali',
    description: 'Terraced rice fields, sacred temples, and surf-perfect waves. Bali is the island that keeps calling you back.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
    tag: 'Islands',
  },
  {
    country: 'Spain',
    city: 'Barcelona',
    description: 'Gaudí\'s surreal architecture, tapas bars open until midnight, and beaches right in the city. Barcelona is Europe\'s coolest city.',
    image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=900&q=80',
    tag: 'Europe',
  },
  {
    country: 'Greece',
    city: 'Santorini',
    description: 'Whitewashed buildings cascading down volcanic cliffs, sunsets over the Aegean, and wines from vines grown in ancient lava.',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=900&q=80',
    tag: 'Europe',
  },
  {
    country: 'Morocco',
    city: 'Marrakech',
    description: 'The souks, riads, and spice markets of the Red City are a full sensory overload. One of the world\'s great travel experiences.',
    image: 'https://images.unsplash.com/photo-1585016495481-91613aa88490?auto=format&fit=crop&w=900&q=80',
    tag: 'Africa',
  },
  {
    country: 'Peru',
    city: 'Cusco',
    description: 'Gateway to Machu Picchu and the Sacred Valley. A city where Inca stonework and Spanish colonial architecture share the same walls.',
    image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=900&q=80',
    tag: 'Americas',
  },
];

interface TrendingArticle {
  title: string;
  excerpt: string;
  image: string;
  time: string;
  tag: string;
  author: string;
  authorAvatar: string;
}

const TRENDING_ARTICLES: TrendingArticle[] = [
  {
    title: 'Is Airbnb Still Worth It in 2026?',
    excerpt: 'Hotels have fought back hard. We compare real costs, flexibility, and experience across 12 destinations to give you the honest answer.',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    time: '4 min read',
    tag: 'Travel Tips',
    author: 'Alex Kim',
    authorAvatar: 'https://i.pravatar.cc/40?img=15',
  },
  {
    title: 'Best Travel Credit Cards This Year',
    excerpt: 'The cards that actually earn points fast, offer real lounge access, and have travel insurance that pays out when you need it.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
    time: '5 min read',
    tag: 'Finance',
    author: 'Rachel Torres',
    authorAvatar: 'https://i.pravatar.cc/40?img=25',
  },
  {
    title: 'How to Travel Solo as a Woman Safely',
    excerpt: 'Practical, honest advice from a woman who has solo-travelled to 60+ countries — covering apps, accommodation, and street smarts.',
    image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=900&q=80',
    time: '8 min read',
    tag: 'Solo Travel',
    author: 'Nina Patel',
    authorAvatar: 'https://i.pravatar.cc/40?img=44',
  },
  {
    title: 'Digital Nomad Visa Countries Ranked',
    excerpt: 'We scored 35 digital nomad visas on cost, speed, internet quality, and quality of life. Here are the clear winners.',
    image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=900&q=80',
    time: '7 min read',
    tag: 'Remote Work',
    author: 'Jordan Blake',
    authorAvatar: 'https://i.pravatar.cc/40?img=18',
  },
];

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function BlogPage() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BlogFormField, string>>>({});
  const [approvedPosts, setApprovedPosts] = useState<BlogPost[]>([]);
  const [userPosts, setUserPosts] = useState<BlogPost[]>([]);
  const [adminPosts, setAdminPosts] = useState<BlogPost[]>([]);
  const [loadingAdminPosts, setLoadingAdminPosts] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [articlePage, setArticlePage] = useState(1);
  const [userPostsPage, setUserPostsPage] = useState(1);
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    coverImage: '',
    tags: '',
  });

  const mergedArticles = useMemo(() => {
    const seen = new Set<string>();
    return [...approvedPosts.map(mapBlogPostToArticle), ...ARTICLES]
      .filter((article) => {
        const key = article.slug || slugify(article.title);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }, [approvedPosts]);

  const filtered = mergedArticles.filter(a => {
    const matchCat = activeCategory === 'All' || a.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.toLowerCase().includes(q) || a.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const featured = mergedArticles.find(a => a.featured) || mergedArticles[0];
  const regular = filtered.filter(a => !a.featured || activeCategory !== 'All' || search);
  const totalArticlePages = Math.max(1, Math.ceil(regular.length / BLOG_PAGE_SIZE));
  const pagedRegular = regular.slice((articlePage - 1) * BLOG_PAGE_SIZE, articlePage * BLOG_PAGE_SIZE);

  const pendingPosts = useMemo(
    () => adminPosts.filter((post) => post.status === 'pending'),
    [adminPosts],
  );
  const totalUserPostPages = Math.max(1, Math.ceil(userPosts.length / BLOG_PAGE_SIZE));
  const pagedUserPosts = userPosts.slice((userPostsPage - 1) * BLOG_PAGE_SIZE, userPostsPage * BLOG_PAGE_SIZE);

  const closeBlogModal = () => {
    setShowCreateModal(false);
    setEditingPostId(null);
    setFieldErrors({});
    setActionError('');
    setForm({ title: '', excerpt: '', content: '', coverImage: '', tags: '' });
  };

  const openCreateBlogModal = () => {
    setEditingPostId(null);
    setFieldErrors({});
    setActionError('');
    setForm({ title: '', excerpt: '', content: '', coverImage: '', tags: '' });
    setShowCreateModal(true);
  };

  const openEditBlogModal = (post: BlogPost) => {
    setEditingPostId(post.id);
    setFieldErrors({});
    setActionError('');
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage || '',
      tags: post.tags.join(', '),
    });
    setShowCreateModal(true);
  };

  const loadAdminPosts = async () => {
    if (!isAdmin) return;
    setLoadingAdminPosts(true);
    try {
      const posts = await blogService.listForAdmin();
      setAdminPosts(posts);
    } catch {
      setActionError('Could not load pending blog posts.');
    } finally {
      setLoadingAdminPosts(false);
    }
  };

  const loadApprovedPosts = async () => {
    setLoadingPosts(true);
    try {
      const posts = await blogService.listApproved();
      setApprovedPosts(posts);
    } catch {
      setActionError('Could not load approved blog posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadUserPosts = async () => {
    if (!user) {
      setUserPosts([]);
      return;
    }
    try {
      const posts = await blogService.listMine();
      setUserPosts(posts);
    } catch {
      setActionError('Could not load your blog posts.');
    }
  };

  useEffect(() => {
    void loadApprovedPosts();
  }, []);

  useEffect(() => {
    void loadUserPosts();
  }, [user]);

  useEffect(() => {
    void loadAdminPosts();
  }, [isAdmin]);

  useEffect(() => {
    setArticlePage(1);
  }, [activeCategory, search]);

  useEffect(() => {
    if (articlePage > totalArticlePages) {
      setArticlePage(totalArticlePages);
    }
  }, [articlePage, totalArticlePages]);

  useEffect(() => {
    if (userPostsPage > totalUserPostPages) {
      setUserPostsPage(totalUserPostPages);
    }
  }, [userPostsPage, totalUserPostPages]);

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setActionError('');
    setFieldErrors({});

    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const content = form.content.trim();
    const coverImage = form.coverImage.trim();
    const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    const nextFieldErrors: Partial<Record<BlogFormField, string>> = {};

    if (title.length < 3) {
      nextFieldErrors.title = 'Title must be at least 3 characters.';
    }
    if (excerpt.length < 10) {
      nextFieldErrors.excerpt = 'Excerpt must be at least 10 characters.';
    }
    if (content.length < 20) {
      nextFieldErrors.content = 'Content must be at least 20 characters.';
    }
    if (coverImage) {
      try {
        new URL(coverImage);
      } catch {
        nextFieldErrors.coverImage = 'Cover image must be a valid URL.';
      }
    }
    if (tags.length > 20) {
      nextFieldErrors.tags = 'Please provide at most 20 tags.';
    } else if (tags.some((tag) => tag.length > 40)) {
      nextFieldErrors.tags = 'Each tag must be 40 characters or less.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setCreating(false);
      return;
    }

    try {
      const payload = {
        title,
        excerpt,
        content,
        coverImage: coverImage || undefined,
        tags,
      };

      if (editingPostId) {
        await blogService.update(editingPostId, payload);
      } else {
        await blogService.create(payload);
      }

      closeBlogModal();
      await loadApprovedPosts();
      await loadUserPosts();
      if (isAdmin) {
        await loadAdminPosts();
      }
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setActionError('Your session has expired. Please log in again.');
        } else if (
          error.status === 400 &&
          typeof error.details === 'object' &&
          error.details !== null &&
          'errors' in error.details
        ) {
          const fieldErrors = (error.details as { errors?: Record<string, string[] | undefined> }).errors;
          if (fieldErrors) {
            setFieldErrors({
              title: fieldErrors.title?.[0],
              excerpt: fieldErrors.excerpt?.[0],
              content: fieldErrors.content?.[0],
              coverImage: fieldErrors.coverImage?.[0],
              tags: fieldErrors.tags?.[0],
            });
          }
          setActionError(error.message || 'Invalid blog data.');
        } else {
          setActionError(error.message || 'Could not submit blog post.');
        }
      } else {
        setActionError('Could not submit blog post.');
      }
    } finally {
      setCreating(false);
    }
  };

  const userPostCountLabel = userPosts.length === 1 ? '1 post' : `${userPosts.length} posts`;

  const renderStatusBadge = (status: BlogPost['status']) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
      status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
    }`}>
      <span className={`h-2 w-2 rounded-full ${status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {status}
    </span>
  );

  const handleApprovePost = async (id: string) => {
    try {
      await blogService.approve(id);
      await loadAdminPosts();
    } catch {
      setActionError('Could not approve blog post.');
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await blogService.remove(id);
      await loadApprovedPosts();
      await loadUserPosts();
      if (isAdmin) {
        await loadAdminPosts();
      }
    } catch {
      setActionError('Could not delete blog post.');
    }
  };

  const renderPagination = (page: number, totalPages: number, onSelect: (nextPage: number) => void) => {
    if (totalPages <= 1) return null;

    return (
      <div className="mt-6 flex items-center justify-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelect(page - 1)}
          disabled={page === 1}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onSelect(pageNumber)}
            className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-semibold transition ${
              pageNumber === page
                ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          onClick={() => onSelect(page + 1)}
          disabled={page === totalPages}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 pt-28 md:pt-32 pb-16 md:pb-20 px-4 md:px-6">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=80"
            className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-indigo-900/70 to-purple-900/80" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-purple-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
            <BookOpen size={13} /> Travel Journal
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tight">
            Stories That<br />Move You
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
            Guides, photography essays, food diaries, and adventure stories from travelers around the world.
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="max-w-xl mx-auto">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search articles, destinations, topics…"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {user && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-6 relative z-20 mb-6">
          <div className="flex justify-end">
            <button
              onClick={openCreateBlogModal}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-lg shadow-purple-500/30 transition"
            >
              <Plus size={16} /> Create Blog
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="font-black text-slate-900 mb-4">Pending Posts (Admin)</h3>
            {loadingAdminPosts ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Loading pending posts...
              </div>
            ) : pendingPosts.length === 0 ? (
              <p className="text-sm text-slate-500">No pending blog posts.</p>
            ) : (
              <div className="space-y-3">
                {pendingPosts.map((post) => (
                  <div key={post.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{post.title}</p>
                        {renderStatusBadge(post.status)}
                      </div>
                      <p className="text-xs text-slate-500">by {post.authorName || post.userId}</p>
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-2 sm:justify-end">
                      <button
                        onClick={() => void handleApprovePost(post.id)}
                        className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        onClick={() => void handleDeletePost(post.id)}
                        className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {user && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-black text-slate-900">Your Blog Posts</h3>
                <p className="text-sm text-slate-500">Track each submission and approval status.</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{userPostCountLabel}</span>
            </div>

            {userPosts.length === 0 ? (
              <p className="text-sm text-slate-500">You have not submitted any blog posts yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                {pagedUserPosts.map((post) => (
                  <div key={post.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900 truncate">{post.title}</p>
                        {renderStatusBadge(post.status)}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt}</p>
                    </div>
                    <div className="flex w-full sm:w-auto shrink-0 items-center gap-2 sm:justify-end">
                      <span className="text-xs text-slate-400">{formatBlogDate(post.createdAt)}</span>
                      <button
                        onClick={() => openEditBlogModal(post)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => void handleDeletePost(post.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
                </div>
                {renderPagination(userPostsPage, totalUserPostPages, setUserPostsPage)}
              </>
            )}
          </div>
        </div>
      )}

      {actionError && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-6">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 inline-flex items-center gap-2">
            <AlertCircle size={14} /> {actionError}
          </div>
        </div>
      )}

      {/* ── CATEGORY TABS ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 py-2 min-w-max">
            {CATEGORIES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActiveCategory(label)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition border-b-2 ${
                  activeCategory === label
                    ? 'border-purple-600 text-purple-700 bg-purple-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-12">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-12">

          {/* ── MAIN CONTENT ── */}
          <div>
            {/* Featured article */}
            {featured && activeCategory === 'All' && !search && (
              <div className="mb-12">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-4 flex items-center gap-2">
                  <TrendingUp size={13} /> Featured Story
                </p>
                <motion.article
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.015, y: -4 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="group relative overflow-hidden rounded-3xl bg-slate-900 cursor-pointer"
                  onClick={() => window.location.href = `/blogs/${featured.slug || slugify(featured.title)}`}
                >
                  <div className="relative h-80 md:h-96 overflow-hidden">
                    <img src={featured.image} alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {featured.tags.map(t => (
                        <span key={t} className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3">{featured.title}</h2>
                    <p className="text-white/70 text-sm line-clamp-2 mb-4">{featured.excerpt}</p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <img src={featured.authorAvatar} alt={featured.author} className="w-8 h-8 rounded-full border-2 border-white/30" referrerPolicy="no-referrer" />
                        <div>
                          <p className="text-white text-xs font-semibold">{featured.author}</p>
                          <p className="text-white/60 text-[10px]">{featured.date} · {featured.readTime}</p>
                        </div>
                      </div>
                      <Link to={`/blogs/${featured.slug || slugify(featured.title)}`} className="flex items-center gap-2 bg-white text-slate-900 text-xs font-bold px-5 py-2.5 rounded-full hover:bg-purple-50 transition">
                        Read Story <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              </div>
            )}

            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Articles</p>
                <h2 className="text-xl font-black text-slate-900">
                  {search ? `"${search}"` : activeCategory === 'All' ? 'Latest Stories' : activeCategory}
                  <span className="ml-2 text-sm font-semibold text-slate-400">({regular.length})</span>
                </h2>
              </div>
            </div>

            {regular.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                <Search size={44} strokeWidth={1.2} />
                <p className="text-base font-semibold text-slate-600">No articles found</p>
                <p className="text-sm">Try a different search or category.</p>
                <button onClick={() => { setSearch(''); setActiveCategory('All'); }}
                  className="mt-2 text-sm text-purple-600 underline underline-offset-4">Clear filters</button>
              </div>
            )}

            {loadingPosts && regular.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Loader2 size={14} className="animate-spin" /> Loading approved articles...
              </div>
            )}

            {/* Article grid */}
            <AnimatePresence>
              <div className="grid gap-6 sm:grid-cols-2">
                {pagedRegular.map((article, i) => (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.04, y: -8 }}
                    className="group bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer"
                    onClick={() => window.location.href = `/blogs/${article.slug || slugify(article.title)}`}
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img src={article.image} alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 bg-white/95 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {article.category}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {article.tags.slice(0, 2).map(t => (
                          <span key={t} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            <Tag size={8} /> {t}
                          </span>
                        ))}
                        {article.status ? renderStatusBadge(article.status) : null}
                      </div>
                      <h3 className="font-black text-slate-900 text-base leading-snug mb-2 line-clamp-2">{article.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-4">{article.excerpt}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <img src={article.authorAvatar} alt={article.author}
                            className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{article.author}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={9} /> {article.readTime}
                            </p>
                          </div>
                        </div>
                        <Link to={`/blogs/${article.slug || slugify(article.title)}`} className="flex items-center gap-1 text-purple-600 text-xs font-bold hover:text-purple-800 transition">
                          Read <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
              {renderPagination(articlePage, totalArticlePages, setArticlePage)}
            </AnimatePresence>
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="mt-12 lg:mt-0 space-y-8">
            {/* Trending */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-purple-600" />
                <h3 className="font-black text-slate-900">Trending Now</h3>
              </div>
              <div className="space-y-4">
                {TRENDING.map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ x: 4 }}
                    className="flex gap-3 group cursor-pointer"
                    onClick={() => window.location.href = `/blogs/${slugify(item.title)}`}
                  >
                    <span className="text-2xl font-black text-slate-200 group-hover:text-purple-200 transition leading-none mt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition leading-snug">{item.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Tag size={9} />{item.tag} · <Clock size={9} />{item.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Categories quick list */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-black text-slate-900 mb-5">Browse by Topic</h3>
              <div className="space-y-2">
                {CATEGORIES.filter(c => c.label !== 'All').map(({ label, icon: Icon }) => {
                  const count = ARTICLES.filter(a => a.category === label).length;
                  return (
                    <button key={label} onClick={() => setActiveCategory(label)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 transition text-left group">
                      <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 group-hover:text-purple-700">
                        <span className="p-1.5 bg-slate-100 group-hover:bg-purple-100 rounded-lg transition">
                          <Icon size={13} className="text-slate-500 group-hover:text-purple-600" />
                        </span>
                        {label}
                      </span>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white">
              <h3 className="font-black text-xl mb-2">Get Weekly Stories</h3>
              <p className="text-purple-200 text-sm mb-4">Join 50,000+ travelers who get the best articles every Thursday.</p>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full bg-white/15 border border-white/20 text-white placeholder-purple-300 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <button className="w-full bg-white text-purple-700 font-bold text-sm py-3 rounded-xl hover:bg-purple-50 transition">
                Subscribe Free
              </button>
            </div>
          </aside>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
        {/* ── TRENDING ARTICLES ── */}
        <div className="mb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1 flex items-center gap-2">
                <TrendingUp size={12} /> Trending
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Trending Articles</h2>
              <p className="text-slate-500 text-sm mt-1">What the travel community is reading right now</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRENDING_ARTICLES.map((item, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
                onClick={() => window.location.href = `/blogs/${slugify(item.title)}`}
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 bg-white/95 text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    {item.tag}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-black text-slate-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-purple-700 transition">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{item.excerpt}</p>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <img src={item.authorAvatar} alt={item.author} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-slate-700 truncate">{item.author}</p>
                      <p className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Clock size={8} /> {item.time}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-purple-500 shrink-0" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* ── RECOMMENDED PLACES ── */}
        <div>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
                <MapPin size={12} /> Explore
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">Recommended Places</h2>
              <p className="text-slate-500 text-sm mt-1">Hand-picked destinations our editors love right now</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RECOMMENDED_PLACES.map((item, i) => (
              <motion.article
                key={item.city}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -5 }}
                className="group rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all cursor-pointer"
                onClick={() => window.location.href = `/destinations?q=${encodeURIComponent(item.city)}`}
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.city}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <span className="absolute top-3 right-3 bg-white/95 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {item.tag}
                  </span>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-black text-xl leading-tight">{item.city}</p>
                    <p className="text-white/70 text-xs">{item.country}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Globe size={11} /> {item.country}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:gap-2 transition-all">
                      Explore <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="bg-slate-900 py-16 px-6 mt-12">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to start your next adventure?</h2>
          <p className="text-slate-400 text-lg mb-8">Plan your perfect trip with AI-powered suggestions for hotels, restaurants, and places to visit.</p>
          <Link to="/destinations"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-sm transition shadow-lg shadow-purple-500/30">
            <Compass size={18} /> Start Planning
          </Link>
        </div>
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Create Blog Post</h3>
              <button
                onClick={closeBlogModal}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBlog} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${fieldErrors.title ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
                />
                {fieldErrors.title ? <p className="text-xs text-rose-600">{fieldErrors.title}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Excerpt</label>
                <input
                  required
                  value={form.excerpt}
                  onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short excerpt"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${fieldErrors.excerpt ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
                />
                {fieldErrors.excerpt ? <p className="text-xs text-rose-600">{fieldErrors.excerpt}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Content</label>
                <textarea
                  required
                  rows={7}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your blog content"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${fieldErrors.content ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
                />
                {fieldErrors.content ? <p className="text-xs text-rose-600">{fieldErrors.content}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Cover Image URL</label>
                <input
                  value={form.coverImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="Cover image URL (optional)"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${fieldErrors.coverImage ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
                />
                {fieldErrors.coverImage ? <p className="text-xs text-rose-600">{fieldErrors.coverImage}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Tags</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="Tags (comma separated)"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${fieldErrors.tags ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}
                />
                {fieldErrors.tags ? <p className="text-xs text-rose-600">{fieldErrors.tags}</p> : null}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeBlogModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-bold"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  {editingPostId ? 'Update' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
