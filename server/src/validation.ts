import { z } from 'zod';
import { ensurePasswordLength } from './sanitize';

const passwordSchema = z.string().superRefine((value, ctx) => {
  try {
    ensurePasswordLength(value);
  } catch (error) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: error instanceof Error ? error.message : 'Invalid password length.',
    });
  }
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.'),
  email: z.string().trim().email('Invalid email address.').max(190, 'Email is too long.'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.'),
  email: z.string().trim().email('Invalid email address.').max(190, 'Email is too long.'),
  phone: z.string().trim().max(30, 'Phone number is too long.').optional().or(z.literal('')),
  profileImage: z.string().trim().optional().or(z.literal('')),
});

export const updateAvatarSchema = z.object({
  profileImage: z.string().trim(), // empty string = delete avatar
});

export const createContactMessageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(190),
  topic: z.string().trim().min(1).max(120),
  destination: z.string().trim().max(160).optional().or(z.literal('')),
  startDate: z.string().trim().max(30).optional().or(z.literal('')),
  endDate: z.string().trim().max(30).optional().or(z.literal('')),
  message: z.string().trim().min(1).max(5000),
});

export const replyContactMessageSchema = z.object({
  reply: z.string().trim().min(1).max(5000),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(['new', 'replied']),
});

export const favoriteSchema = z.object({
  id: z.string().trim().min(1).max(191),
  title: z.string().trim().min(1).max(191),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  imageUrl: z.string().trim().url(),
  price: z.number().nonnegative(),
  currency: z.string().trim().min(1).max(10),
  rating: z.number().nonnegative().max(5),
  propertyType: z.string().trim().min(1).max(80),
});

export const createBookingSchema = z.object({
  userId: z.string().trim().max(191).optional().or(z.literal('')),
  itineraryId: z.string().trim().max(191).optional().or(z.literal('')),
  placeId: z.string().trim().max(191).optional().or(z.literal('')),
  placeName: z.string().trim().max(191).optional().or(z.literal('')),
  bookingType: z.enum(['hotel', 'flight', 'restaurant']).optional(),
  flightName: z.string().trim().max(191).optional().or(z.literal('')),
  hotelName: z.string().trim().min(1).max(191),
  location: z.string().trim().max(191).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  checkIn: z.string().trim().min(1).max(30),
  checkOut: z.string().trim().min(1).max(30),
  guests: z.number().int().positive().max(20),
  flightDetails: z.object({
    airline: z.string().trim().min(1).max(120),
    flightNumber: z.string().trim().min(1).max(80),
    from: z.string().trim().min(1).max(120),
    fromCode: z.string().trim().min(1).max(10),
    to: z.string().trim().min(1).max(120),
    toCode: z.string().trim().min(1).max(10),
    departTime: z.string().trim().min(1).max(80),
    arriveTime: z.string().trim().min(1).max(80),
    duration: z.string().trim().min(1).max(60),
  }).optional(),
  totalPrice: z.number().nonnegative(),
  currency: z.string().trim().min(1).max(10),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
});

export const createBookingWithTripSchema = createBookingSchema.extend({
  destination: z.string().trim().min(1).max(191),
  tripTitle: z.string().trim().max(191).optional().or(z.literal('')),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});

export const destinationSchema = z.object({
  name: z.string().trim().min(1).max(191),
  type: z.enum(['hotel', 'restaurant', 'attraction']),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  location: z.string().trim().max(191).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().optional().or(z.literal('')),
  priceRange: z.string().trim().max(80).optional().or(z.literal('')),
  rating: z.number().min(0).max(5).optional(),
});

export const searchFlightsSchema = z.object({
  from: z.string().trim().min(1).max(120),
  to: z.string().trim().min(1).max(160),
  outboundDate: z.string().trim().min(1).max(20),
  returnDate: z.string().trim().max(20).optional().or(z.literal('')),
  currency: z.string().trim().min(1).max(10).optional().or(z.literal('')),
  hl: z.string().trim().min(2).max(10).optional().or(z.literal('')),
});

export const searchLocalPlacesSchema = z.object({
  destination: z.string().trim().min(1).max(160),
  category: z.enum(['hotels', 'restaurants', 'attractions']),
});

export const createItinerarySchema = z.object({
  title: z.string().trim().min(1).max(191),
  destination: z.string().trim().min(1).max(191),
  startDate: z.string().trim().min(1).max(20),
  endDate: z.string().trim().min(1).max(20),
});

export const addItineraryItemSchema = z.object({
  userId: z.string().trim().max(191).optional().or(z.literal('')),
  itineraryId: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
  placeName: z.string().trim().max(191).optional().or(z.literal('')),
  itinerary: createItinerarySchema.optional(),
  dayNumber: z.number().int().positive().optional(),
  timeSlot: z.string().trim().min(1).max(30).optional(),
  notes: z.string().trim().max(5000).optional().or(z.literal('')),
  place: z.object({
    externalId: z.string().trim().max(191).optional(),
    name: z.string().trim().min(1).max(191),
    type: z.enum(['hotel', 'restaurant', 'attraction', 'place']),
    location: z.string().trim().max(191).optional().or(z.literal('')),
    imageUrl: z.string().trim().url().optional().or(z.literal('')),
    rating: z.number().min(0).max(5).optional(),
    price: z.number().min(0).max(999999).optional(),
    currency: z.string().trim().min(1).max(10).optional(),
  }),
}).refine((data) => Boolean(data.itineraryId) || Boolean(data.itinerary), {
  path: ['itineraryId'],
  message: 'Provide itineraryId or itinerary details.',
});

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(3).max(191),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(20).max(50000),
  coverImage: z.string().trim().url().optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});
