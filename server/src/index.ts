import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { promises as fs } from 'fs';
import rateLimit from 'express-rate-limit';
import path from 'path';
import session from 'express-session';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { ensureAppTables, healthcheckDatabase, runSchemaUpgrades } from './db';
import { env } from './env';
import { requireAdmin, requireAuth } from './authMiddleware';
import { sessionStore } from './sessionStore';
import {
  createContactMessageSchema,
  createBlogPostSchema,
  createBookingSchema,
  createBookingWithTripSchema,
  createItinerarySchema,
  changePasswordSchema,
  favoriteSchema,
  destinationSchema,
  loginSchema,
  addItineraryItemSchema,
  replyContactMessageSchema,
  registerSchema,
  searchFlightsSchema,
  searchLocalPlacesSchema,
  updateBookingStatusSchema,
  updateContactStatusSchema,
  updateAvatarSchema,
  updateProfileSchema,
} from './validation';
import {
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  listUsers,
  toSafeUser,
  updateLastLoginAt,
  updateUserPassword,
  updateUserProfile,
} from './userRepository';
import {
  createContactMessage,
  deleteContactMessage,
  listContactMessages,
  listContactMessagesByUser,
  parseTicketId,
  replyToContactMessage,
  updateContactMessageStatus,
} from './contactRepository';
import {
  listFavoritesByUser,
  removeFavorite,
  saveFavorite,
} from './favoritesRepository';
import {
  addItemToItinerary,
  createItineraryForUser,
  deleteItineraryAsAdmin,
  deleteItineraryById,
  findOrCreateItineraryForUserByDestination,
  listAllItinerariesForAdmin,
  listItinerariesByUser,
  updateItineraryById,
} from './itineraryRepository';
import {
  createBookingForUser,
  findBookingById,
  listBookingsForAdmin,
  updateBookingStatus,
} from './bookingRepository';
import {
  createDestination,
  deleteDestination,
  listDestinations,
  listLatestDestinations,
  searchDestinations,
  updateDestination,
} from './destinationRepository';
import { searchFlightsWithSerpApi } from './flightSearch';
import { searchLocalPlacesWithSerpApi } from './localSearch';
import {
  approveBlogPost,
  createPendingBlogPost,
  deleteBlogPost,
  findApprovedBlogPostBySlug,
  listApprovedBlogPosts,
  listBlogPostsByUser,
  listBlogPostsForAdmin,
  findBlogPostById,
  updateBlogPostById,
} from './blogRepository';
import { normalizeEmail } from './sanitize';

const app = express();
const workspaceRoot = path.resolve(process.cwd());
const uploadedDestinationImageDir = path.join(workspaceRoot, 'public', 'uploads', 'destinations');

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      env.clientOrigin,
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(workspaceRoot, 'public', 'uploads')));
app.use(session({
  name: 'voyage.sid',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.get('/api/health', async (_req, res, next) => {
  try {
    await healthcheckDatabase();
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', authRateLimit, async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existingUser = await findUserByEmail(payload.email);

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(payload.password, env.bcryptRounds);
    const createdUser = await createUser({
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: 'user',
    });

    return res.status(201).json({
      message: 'Registration successful.',
      user: createdUser ? toSafeUser(createdUser) : null,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await findUserByEmail(payload.email);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.regenerate(async (sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      req.session.user = { id: user.id, role: user.role };
      await updateLastLoginAt(user.id);

      return res.json({
        message: 'Login successful.',
        user: toSafeUser(user),
      });
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: req.authUser });
});

app.post('/api/auth/logout', requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('voyage.sid', {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
    });
    return res.json({ message: 'Logged out successfully.' });
  });
});

app.post('/api/auth/change-password', requireAuth, async (req, res, next) => {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const currentUser = await findUserById(req.authUser!.id);

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const matchesCurrentPassword = await bcrypt.compare(payload.currentPassword, currentUser.passwordHash);
    if (!matchesCurrentPassword) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, env.bcryptRounds);
    await updateUserPassword(currentUser.id, passwordHash);

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/me', requireAuth, async (req, res) => {
  res.json({ user: req.authUser });
});

app.patch('/api/users/me', requireAuth, async (req, res, next) => {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(payload.email);
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser && existingUser.id !== req.authUser!.id) {
      return res.status(409).json({ message: 'That email is already in use.' });
    }

    const updatedUser = await updateUserProfile(req.authUser!.id, {
      name: payload.name,
      email: normalizedEmail,
      phone: payload.phone || '',
      profileImage: payload.profileImage || '',
    });

    return res.json({
      message: 'Profile updated successfully.',
      user: updatedUser ? toSafeUser(updatedUser) : null,
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/me/avatar', requireAuth, async (req, res, next) => {
  try {
    const payload = updateAvatarSchema.parse(req.body);
    const current = req.authUser!;
    // Empty string means delete (reset to default avatar)
    const updatedUser = await updateUserProfile(current.id, {
      name: current.displayName,
      email: current.email,
      phone: current.phone ?? '',
      profileImage: payload.profileImage || undefined,
    });
    return res.json({
      message: payload.profileImage ? 'Avatar updated.' : 'Avatar removed.',
      user: updatedUser ? toSafeUser(updatedUser) : null,
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/users/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.authUser!.id;
    req.session.destroy(() => undefined);
    await deleteUserById(userId);
    res.clearCookie('voyage.sid', { httpOnly: true, secure: env.isProduction, sameSite: 'lax' });
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    await deleteUserById(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/contact/messages', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const messages = await listContactMessages();
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

app.get('/api/contact/messages/mine', requireAuth, async (req, res, next) => {
  try {
    const messages = await listContactMessagesByUser(req.authUser!.id);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

app.post('/api/contact/messages', requireAuth, async (req, res, next) => {
  try {
    const payload = createContactMessageSchema.parse(req.body);
    const message = await createContactMessage({
      userId: req.authUser!.id,
      name: payload.name,
      email: payload.email,
      topic: payload.topic,
      destination: payload.destination || '',
      startDate: payload.startDate || '',
      endDate: payload.endDate || '',
      message: payload.message,
    });
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

app.post('/api/contact/messages/:id/reply', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const payload = replyContactMessageSchema.parse(req.body);
    const ticketId = parseTicketId(req.params.id);
    await replyToContactMessage(ticketId, payload.reply);
    res.json({ message: 'Reply sent.' });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/contact/messages/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const payload = updateContactStatusSchema.parse(req.body);
    const ticketId = parseTicketId(req.params.id);
    await updateContactMessageStatus(ticketId, payload.status);
    res.json({ message: 'Status updated.' });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/contact/messages/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const ticketId = parseTicketId(req.params.id);
    await deleteContactMessage(ticketId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/favorites', requireAuth, async (req, res, next) => {
  try {
    const favorites = await listFavoritesByUser(req.authUser!.id);
    res.json({ favorites });
  } catch (error) {
    next(error);
  }
});

app.post('/api/favorites', requireAuth, async (req, res, next) => {
  try {
    const payload = favoriteSchema.parse(req.body);
    await saveFavorite(req.authUser!.id, payload);
    res.status(201).json({ message: 'Favorite saved.' });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/favorites/:id', requireAuth, async (req, res, next) => {
  try {
    await removeFavorite(req.authUser!.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookings', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const bookings = await listBookingsForAdmin();
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings', requireAuth, async (req, res, next) => {
  try {
    const payload = createBookingSchema.parse(req.body);
    const itineraryId = payload.itineraryId ? Number(payload.itineraryId) : undefined;
    const booking = await createBookingForUser({
      userId: req.authUser!.id,
      itineraryId: itineraryId && Number.isInteger(itineraryId) && itineraryId > 0 ? itineraryId : undefined,
      placeId: payload.placeId ? Number(payload.placeId) : undefined,
      placeName: payload.placeName || payload.hotelName,
      bookingType: payload.bookingType || 'hotel',
      flightName: payload.flightName || payload.hotelName,
      hotelName: payload.hotelName,
      location: payload.location || undefined,
      imageUrl: payload.imageUrl || undefined,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests,
      flightDetails: payload.flightDetails,
      totalPrice: payload.totalPrice,
      currency: payload.currency,
      status: payload.status,
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings/create-with-trip', requireAuth, async (req, res, next) => {
  try {
    const payload = createBookingWithTripSchema.parse(req.body);
    const itineraryId = await findOrCreateItineraryForUserByDestination(req.authUser!.id, {
      title: payload.tripTitle || `Trip to ${payload.destination}`,
      destination: payload.destination,
      startDate: payload.checkIn,
      endDate: payload.checkOut,
    });

    const placeName = payload.placeName || payload.hotelName || payload.flightName || payload.destination;
    const tripItem = await addItemToItinerary(req.authUser!.id, {
      itineraryId,
      dayNumber: 1,
      timeSlot: payload.flightDetails?.departTime.slice(11, 16) || '09:00',
      notes: payload.bookingType === 'flight'
        ? `FLIGHT: ${payload.flightDetails?.airline || payload.flightName || payload.hotelName} ${payload.flightDetails?.flightNumber || ''} · ${payload.flightDetails?.fromCode || ''} ${payload.flightDetails?.departTime || ''} -> ${payload.flightDetails?.toCode || ''} ${payload.flightDetails?.arriveTime || ''}`.trim()
        : `BOOKED: ${payload.hotelName}`,
      place: {
        externalId: payload.placeId || payload.flightDetails?.flightNumber || payload.flightName || payload.hotelName,
        name: placeName,
        type: 'place',
        location: payload.destination,
        imageUrl: payload.imageUrl || undefined,
        price: payload.totalPrice,
        currency: payload.currency,
      },
    });

    const booking = await createBookingForUser({
      userId: req.authUser!.id,
      itineraryId,
      placeId: tripItem.placeId,
      placeName,
      bookingType: payload.bookingType || 'flight',
      flightName: payload.flightName || payload.hotelName,
      hotelName: payload.hotelName,
      location: payload.location || payload.destination,
      imageUrl: payload.imageUrl || undefined,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
      guests: payload.guests,
      flightDetails: payload.flightDetails,
      totalPrice: payload.totalPrice,
      currency: payload.currency,
      status: payload.status,
    });

    res.status(201).json({
      success: true,
      booking,
      itineraryId: String(itineraryId),
      itinerary: {
        id: String(itineraryId),
        userId: String(req.authUser!.id),
        title: payload.tripTitle || `Trip to ${payload.destination}`,
        destination: payload.destination,
        startDate: payload.checkIn,
        endDate: payload.checkOut,
        status: 'draft',
        createdAt: new Date().toISOString(),
        days: [
          {
            dayNumber: 1,
            activities: [
              {
                id: String(tripItem.itemId),
                time: payload.flightDetails?.departTime.slice(11, 16) || '09:00',
                placeId: payload.placeId || String(tripItem.placeId),
                placeName,
                notes: payload.bookingType === 'flight'
                  ? `FLIGHT: ${payload.flightDetails?.airline || payload.flightName || payload.hotelName} ${payload.flightDetails?.flightNumber || ''} · ${payload.flightDetails?.fromCode || ''} ${payload.flightDetails?.departTime || ''} -> ${payload.flightDetails?.toCode || ''} ${payload.flightDetails?.arriveTime || ''}`.trim()
                  : `BOOKED: ${payload.hotelName}`,
                location: payload.destination,
                price: payload.totalPrice,
                currency: payload.currency,
                bookings: booking ? [booking] : [],
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/destinations', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const destinations = await listDestinations();
    res.json({ destinations });
  } catch (error) {
    next(error);
  }
});

app.get('/api/destinations/latest', async (req, res, next) => {
  try {
    const limitParam = Number(req.query.limit ?? 12);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 12;
    const type = req.query.type;
    const destinationType = type === 'hotel' || type === 'restaurant' || type === 'attraction'
      ? type
      : undefined;
    const destinations = await listLatestDestinations(limit, destinationType);
    res.json({ destinations });
  } catch (error) {
    next(error);
  }
});

app.get('/api/destinations/search', async (req, res, next) => {
  try {
    const limitParam = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 250) : 100;
    const type = req.query.type;
    const destinationType = type === 'hotel' || type === 'restaurant' || type === 'attraction'
      ? type
      : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const destinations = await searchDestinations(query, limit, destinationType);
    res.json({ destinations });
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads/destination-image', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const filename = typeof req.body?.filename === 'string' ? req.body.filename.trim() : '';
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim() : '';
    const data = typeof req.body?.data === 'string' ? req.body.data.trim() : '';

    if (!filename || !contentType || !data) {
      return res.status(400).json({ message: 'Missing upload payload.' });
    }

    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(contentType)) {
      return res.status(400).json({ message: 'Only PNG, JPEG, WEBP, and GIF images are supported.' });
    }

    const buffer = Buffer.from(data, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ message: 'Uploaded image is empty.' });
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Image must be 5MB or smaller.' });
    }

    const extension = path.extname(filename).toLowerCase() || ((): string => {
      if (/image\/png/i.test(contentType)) return '.png';
      if (/image\/webp/i.test(contentType)) return '.webp';
      if (/image\/gif/i.test(contentType)) return '.gif';
      return '.jpg';
    })();

    await fs.mkdir(uploadedDestinationImageDir, { recursive: true });
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    await fs.writeFile(path.join(uploadedDestinationImageDir, storedName), buffer);

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/destinations/${storedName}`;
    return res.status(201).json({ imageUrl });
  } catch (error) {
    next(error);
  }
});

app.post('/api/destinations', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const payload = destinationSchema.parse(req.body);
    const destination = await createDestination({
      name: payload.name,
      type: payload.type,
      description: payload.description || '',
      location: payload.location || '',
      imageUrl: payload.imageUrl || '',
      priceRange: payload.priceRange || '',
      rating: payload.rating ?? 4.5,
    });
    res.status(201).json({ success: true, destination });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/destinations/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid destination id.' });
    }

    const payload = destinationSchema.partial().parse(req.body);
    const destination = await updateDestination(id, {
      name: payload.name,
      type: payload.type,
      description: payload.description,
      location: payload.location,
      imageUrl: payload.imageUrl,
      priceRange: payload.priceRange,
      rating: payload.rating,
    });
    res.json({ success: true, destination });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/destinations/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid destination id.' });
    }

    await deleteDestination(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.patch('/api/bookings/:id/status', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid booking id.' });
    }

    const booking = await findBookingById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isOwner = booking.userId === String(req.authUser!.id);
    if (!isOwner && req.authUser!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have access to this booking.' });
    }

    const payload = updateBookingStatusSchema.parse(req.body);
    await updateBookingStatus(id, payload.status);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/flights/search', async (req, res, next) => {
  try {
    const payload = searchFlightsSchema.parse(req.body);
    const result = await searchFlightsWithSerpApi({
      from: payload.from,
      to: payload.to,
      outboundDate: payload.outboundDate,
      returnDate: payload.returnDate || undefined,
      currency: payload.currency || 'USD',
      hl: payload.hl || 'en',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/places/search', async (req, res, next) => {
  try {
    const payload = searchLocalPlacesSchema.parse(req.body);
    const result = await searchLocalPlacesWithSerpApi(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/itineraries/mine', requireAuth, async (req, res, next) => {
  try {
    const itineraries = await listItinerariesByUser(req.authUser!.id);
    res.json({ itineraries });
  } catch (error) {
    next(error);
  }
});

app.get('/api/itineraries', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const itineraries = await listAllItinerariesForAdmin();
    res.json({ itineraries });
  } catch (error) {
    next(error);
  }
});

app.post('/api/itinerary/create', requireAuth, async (req, res, next) => {
  try {
    const payload = createItinerarySchema.parse(req.body);
    const itineraryId = await createItineraryForUser(req.authUser!.id, payload);

    res.status(201).json({
      itineraryId: String(itineraryId),
      itinerary: {
        id: String(itineraryId),
        userId: String(req.authUser!.id),
        title: payload.title,
        destination: payload.destination,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: 'draft',
        createdAt: new Date().toISOString(),
        days: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/itinerary/add-item', requireAuth, async (req, res, next) => {
  try {
    const payload = addItineraryItemSchema.parse(req.body);
    const result = await addItemToItinerary(req.authUser!.id, {
      itineraryId: payload.itineraryId ? Number(payload.itineraryId) : undefined,
      itinerary: payload.itinerary,
      dayNumber: payload.dayNumber,
      timeSlot: payload.timeSlot,
      notes: payload.notes,
      place: {
        externalId: payload.place.externalId,
        name: payload.placeName || payload.place.name,
        type: payload.place.type,
        location: payload.place.location || undefined,
        imageUrl: payload.place.imageUrl || undefined,
        rating: payload.place.rating,
        price: payload.place.price,
        currency: payload.place.currency || undefined,
      },
    });

    res.status(201).json({
      itineraryId: String(result.itineraryId),
      dayId: String(result.dayId),
      itemId: String(result.itemId),
      placeId: String(result.placeId),
      placeName: payload.placeName || payload.place.name,
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/itineraries/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid itinerary id.' });
    }

    const payload = req.body as {
      title?: string;
      destination?: string;
      startDate?: string;
      endDate?: string;
      status?: 'draft' | 'confirmed' | 'upcoming' | 'completed';
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
    };

    await updateItineraryById(req.authUser!.id, id, payload);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/itineraries/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid itinerary id.' });
    }

    await deleteItineraryById(req.authUser!.id, id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/itineraries/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid itinerary id.' });
    }

    await deleteItineraryAsAdmin(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/blogs', async (_req, res, next) => {
  try {
    const posts = await listApprovedBlogPosts();
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/blog/posts', async (_req, res, next) => {
  try {
    const posts = await listApprovedBlogPosts();
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/blog/posts/admin', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const posts = await listBlogPostsForAdmin();
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/blog/posts/mine', requireAuth, async (req, res, next) => {
  try {
    const posts = await listBlogPostsByUser(req.authUser!.id);
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/blog/posts/:slug', async (req, res, next) => {
  try {
    const post = await findApprovedBlogPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: 'Blog post not found.' });
    }
    return res.json({ post });
  } catch (error) {
    next(error);
  }
});

app.post('/api/blog/posts', requireAuth, async (req, res, next) => {
  try {
    const payload = createBlogPostSchema.parse(req.body);
    const post = await createPendingBlogPost({
      userId: req.authUser!.id,
      authorName: req.authUser!.displayName,
      title: payload.title,
      excerpt: payload.excerpt,
      content: payload.content,
      coverImage: payload.coverImage || undefined,
      tags: payload.tags || [],
    });

    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
});

app.put('/api/blog/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid blog id.' });
    }

    const existing = await findBlogPostById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Blog post not found.' });
    }

    const isOwner = existing.userId === String(req.authUser!.id);
    if (!isOwner && req.authUser!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have access to this blog post.' });
    }

    const payload = createBlogPostSchema.parse(req.body);
    const post = await updateBlogPostById({
      id,
      title: payload.title,
      excerpt: payload.excerpt,
      content: payload.content,
      coverImage: payload.coverImage || undefined,
      tags: payload.tags || [],
    });

    return res.json({ post });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/blog/posts/:id/approve', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid blog id.' });
    }

    await approveBlogPost(id, req.authUser!.id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/blog/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid blog id.' });
    }

    const existing = await findBlogPostById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Blog post not found.' });
    }

    const isOwner = existing.userId === String(req.authUser!.id);
    if (!isOwner && req.authUser!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have access to this blog post.' });
    }

    await deleteBlogPost(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: error.flatten().fieldErrors,
    });
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  return res.status(500).json({ message });
});

async function startServer() {
  await ensureAppTables();
  await runSchemaUpgrades();
  app.listen(env.port, () => {
    console.log(`Voyage auth server listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
