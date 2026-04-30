<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your travel app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## How This Website Works

Travel Planner is a full-stack trip planning web app where users can discover destinations, build itineraries, save favorites, and manage bookings-style travel details in one place.

### User Flow

1. Home page (Landing):
   - Users browse popular destinations and travel categories.
   - Clicking a destination or tag routes to filtered results on the Destinations page.

2. Destinations page:
   - Shows destination cards and travel results (hotels, restaurants, attractions, flights).
   - Supports URL-based filters (example: tag, category, location) so navigation from Home applies filters automatically.
   - Users can search, browse, and add places to a trip.

3. Itinerary page:
   - Users create and manage trips with dates and destinations.
   - Trips can be expanded to view details and planned items.
   - Pagination is used to keep large trip lists easy to browse.

4. Profile page:
   - Displays user profile data, saved places, and trip history.
   - Trip items can navigate back to the related itinerary view.

5. Admin dashboard:
   - Admin can review users, trips, bookings, destinations, and contact submissions.
   - Includes filtering and pagination for large datasets.

### Technical Overview

- Frontend: React + TypeScript + Vite
- Backend: Node.js/TypeScript server with repository pattern
- Database: SQL schema and migration files in `server/db/migrations`
- AI integration: Gemini-powered recommendations and content generation
- Auth/session: User authentication context and session handling in frontend and server

### Typical Development Flow

1. Start frontend and backend services locally.
2. Create or sign in as a user.
3. Explore destinations, apply filters, and save places.
4. Build itineraries and verify trip management flows.
5. (Optional) Access admin pages for management features.
