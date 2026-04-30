import React, { useEffect, useMemo, useState } from 'react';
import Footer from '../components/Footer';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { blogService, BlogPost as BlogPostRecord } from '../lib/services';
import {
  ArrowLeft, Clock, Calendar, Tag, Share2,
  Bookmark, Heart, MessageCircle, ArrowRight,
  Globe, MapPin, Facebook, Twitter, Link2
} from 'lucide-react';

function slugify(title: string): string {
  return title.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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
  const palette = ['1', '2', '3', '4', '5'];
  return `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80&sig=${palette[title.length % palette.length]}`;
}

/* ── Article data (same as Blog.tsx) ─────────────────────── */
interface Article {
  id: number; title: string; excerpt: string; category: string;
  image: string; author: string; authorAvatar: string;
  date: string; readTime: string; featured?: boolean; tags: string[];
  content?: string;
  slug?: string;
}

function mapBlogPostToArticle(post: BlogPostRecord): Article {
  return {
    id: Number(post.id),
    title: post.title,
    excerpt: post.excerpt,
    category: categoryFromTags(post.tags),
    image: post.coverImage || fallbackCover(post.title),
    author: post.authorName,
    authorAvatar: post.authorProfileImage || avatarFromSeed(post.authorName || post.userId),
    date: formatBlogDate(post.createdAt),
    readTime: estimateReadTime(post.content),
    tags: post.tags,
    content: post.content,
    slug: post.slug,
  };
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: '10 Hidden Gems in Southeast Asia You Must Visit in 2026',
    excerpt: 'Beyond the tourist trails — discover secret beaches, jungle temples, and night markets that most travelers never find.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80',
    author: 'Maya Tanaka', authorAvatar: 'https://i.pravatar.cc/80?img=5',
    date: 'Apr 12, 2026', readTime: '8 min read', featured: true,
    tags: ['Asia', 'Budget', 'Off-the-beaten-path'],
    content: `Southeast Asia has been on every backpacker's radar for decades, but the real magic happens once you step off the well-worn path. In 2026, as overtourism threatens iconic spots like Angkor Wat and Koh Samui, a new generation of travellers is seeking something more authentic.

## 1. Phong Nha, Vietnam
Deep in central Vietnam, Phong Nha-Ke Bang National Park hides a labyrinth of caves so vast that clouds form inside them. Son Doong Cave — the world's largest — now admits only 1,000 visitors per year. Book a year in advance.

## 2. Coron, Palawan, Philippines
While El Nido gets the Instagram crowds, Coron quietly earns its title as the world's best wreck diving destination. Thirty WWII Japanese warships rest in clear, warm water. Above the surface: dramatic limestone karsts and secret lagoons.

## 3. Kampot, Cambodia
An old French colonial town on the banks of the Praek Tuek Chhu river. The pepper plantations here produce what many chefs consider the world's finest black pepper. Rent a moped, explore the crumbling countryside, eat the best crab of your life.

## 4. Mrauk U, Myanmar
Thousands of ancient temples spread across a hilly landscape, with almost no other tourists. Think Bagan, but without the crowds or the commercialisation. Getting here requires a 5-hour boat journey from Sittwe — which makes the silence feel earned.

## 5. Nong Khiaw, Laos
Dramatic limestone mountains plunge into the Nam Ou river. The village has a handful of bungalows, a weekly market, and one of the most beautiful treks in Southeast Asia — a 2-day journey to the village of Muang Ngoi.

## Planning Your Trip
The best time to visit most of Southeast Asia is November to February — dry season, moderate temperatures. Budget around $50–80 per day for comfortable mid-range travel. Pack light: everything you need can be found (and is better quality) locally.

The secret to discovering these hidden gems? Talk to locals. Every tuk-tuk driver, every guesthouse owner has a favourite place they've never seen mentioned in a guidebook. That recommendation is worth more than any list.`,
  },
  {
    id: 2,
    title: 'The Ultimate Tokyo Food Tour: 48 Hours of Epic Eating',
    excerpt: 'From Tsukiji breakfast sushi to midnight ramen in Shinjuku — a food lover\'s guide to eating your way across Japan\'s electric capital.',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=80',
    author: 'James Lee', authorAvatar: 'https://i.pravatar.cc/80?img=11',
    date: 'Apr 8, 2026', readTime: '6 min read',
    tags: ['Japan', 'Food', 'Tokyo'],
    content: `Tokyo has more Michelin-starred restaurants than any other city on earth. But the most extraordinary food moments rarely happen in those polished dining rooms. They happen standing at a counter, elbow-to-elbow with locals, steam rising from a bowl of perfectly made ramen.

## Day 1: Morning to Afternoon

**Tsukiji Outer Market (7:00 AM)** — The inner market moved to Toyosu, but Tsukiji's outer market remains the best breakfast in Tokyo. Queue for tamagoyaki (sweet rolled omelette), eat fresh uni on rice, drink green tea.

**Ginza for Lunch** — The basement floors of Ginza department stores are food halls of extraordinary depth. Matcha from Kyoto. Wagyu beef sushi. Fruit sandwiches with perfect white bread and cream. Spend an hour just looking before eating anything.

**Shibuya for Afternoon Snacks** — Conveyor belt sushi at Uobei, where dishes arrive at 160 km/h. Then matcha soft serve from Nana's Green Tea.

## Day 1: Evening

**Shinjuku's Omoide Yokocho (Memory Lane)** — This alley of tiny yakitori stalls has operated since just after World War II. Sit at a counter that fits six people, order yakitori and highballs. The smoke will infuse your clothes. You won't care.

## Day 2

**Harajuku Crepes** — Ridiculous constructions of cream, fruit, and waffle cone. Eat while walking.

**Tsukemen at Fuunji** — Thick, rich ramen broth for dipping noodles. Queue before opening or wait an hour.

**Depachika Grand Finale** — Return to a department store basement. Buy everything you couldn't carry before.

Tokyo's food scene rewards curiosity over planning. The best meals are usually the ones you discover by following a queue.`,
  },
  {
    id: 3,
    title: 'Bali on a Budget: How to Live Like Royalty for $50/Day',
    excerpt: 'Luxury villas, stunning rice terraces, and world-class sunsets — Bali delivers paradise without breaking the bank.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1400&q=80',
    author: 'Sofia Reyes', authorAvatar: 'https://i.pravatar.cc/80?img=9',
    date: 'Apr 3, 2026', readTime: '7 min read',
    tags: ['Bali', 'Budget', 'Indonesia'],
    content: `The perception that Bali is expensive is a myth born from staying in Seminyak beach clubs and eating at Instagrammable cafes designed for tourists. The real Bali — where the food is better, the rice terraces are quieter, and the ceremonies are genuine — costs a fraction of the tourist track.

## Where to Stay

Private villas with pools in Ubud rent for $40–70 per night. In the low season (November–March), they drop further. Look on Booking.com outside of the curated tourist areas — Penestanan, Mas, Tegallalang.

## What to Eat

A full meal at a warung (family-owned restaurant) costs $2–4. Nasi campur — rice with a selection of curries, vegetables, and satay — is the best meal in Bali and costs less than a coffee at a tourist cafe. 

## Transport

Rent a scooter for $6–8 per day. This unlocks Bali completely — you can reach rice terraces, waterfalls, and temples that tour buses can't access. Grab (the Asian Uber) handles everything else.

## What to See for Free

Tegallalang Rice Terraces, Tirta Empul temple, sunrise at Mount Batur (hike independently, no guide required), every beach on the Bukit Peninsula.

## The $50 Day Breakdown
- Accommodation: $15 (private room in guesthouse)
- Breakfast: $3 (fruit, eggs, coffee at warung)
- Lunch: $3 (nasi campur)
- Scooter rental: $7
- Dinner: $5 (seafood BBQ on the beach)
- Activities: $10 (temple entry, snorkelling, etc.)
- Miscellaneous: $7

Total: $50. And this is a genuinely excellent day in one of the world's most beautiful places.`,
  },
  {
    id: 4,
    title: 'Chasing the Northern Lights: Iceland Winter Photography Guide',
    excerpt: 'Capturing the aurora borealis requires patience, the right gear, and knowing exactly where to stand.',
    category: 'Photography',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1400&q=80',
    author: 'Erik Thorvald', authorAvatar: 'https://i.pravatar.cc/80?img=3',
    date: 'Mar 28, 2026', readTime: '10 min read',
    tags: ['Iceland', 'Photography', 'Winter'],
    content: `I've photographed the northern lights eleven times over four visits to Iceland. The first time, I pointed my phone at a faint green smear in the sky and got nothing. By my fourth visit, I was lying in snow at 2 AM in -15°C, watching the entire sky turn electric green and violet, with a perfectly exposed shot on my camera.

## The Gear

A full-frame mirrorless camera makes a significant difference in low-light performance. But even an entry-level DSLR can capture strong auroras. What you cannot compromise on: a fast wide-angle lens (f/1.8 or f/2.8), a sturdy tripod, and spare batteries (cold kills batteries fast).

## The Settings

Manual mode. ISO 1600–3200. Aperture wide open (f/1.8–2.8). Shutter speed 10–20 seconds for a static aurora, 2–5 seconds for an active dancing display. Focus manually at infinity. Shoot RAW.

## Finding Dark Sky

Drive 30 minutes from Reykjavik and you've left light pollution behind. The Snæfellsnes Peninsula, the Westfjords, and the area around Kirkjufell are all excellent. Check the weather forecast first — clouds are your enemy.

## The Aurora Forecast

The Icelandic Meteorological Office aurora forecast (vedur.is) gives a KP index prediction. KP 2 is faint and requires total darkness. KP 5+ means visible aurora even through thin cloud. The best conditions: clear sky + KP 4+.

## Patience

Every aurora photographer I know has spent three or four nights seeing nothing, followed by one night that made everything worth it. Check the forecast at midnight, set an alarm for 1 AM, look out the window before giving up. The moment the sky begins to dance, you won't remember being cold.`,
  },
  {
    id: 5,
    title: "The World's Most Breathtaking Beaches for 2026",
    excerpt: 'Pink sands, turquoise lagoons, and deserted coves — ranking the most spectacular coastlines on the planet.',
    category: 'Beaches',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
    author: 'Priya Mehta', authorAvatar: 'https://i.pravatar.cc/80?img=47',
    date: 'Mar 22, 2026', readTime: '5 min read',
    tags: ['Beach', 'Luxury', 'Islands'],
    content: `What makes a beach extraordinary? The question resists simple answers. Whiteness of sand, temperature of water, clarity of sky — these matter. But the best beaches combine the physical with the ineffable: that feeling of absolute removal from the world, of being exactly where you are supposed to be.

## 1. Anse Source d'Argent, La Digue, Seychelles
Rose-pink granite boulders against white sand and shallow turquoise water. Consistently rated the most photographed beach on earth, though the image never fully captures the dreamlike quality of being there.

## 2. Navagio Beach, Zakynthos, Greece
Accessible only by boat, enclosed by 200-metre white cliffs, with a shipwrecked freighter rusting beautifully in the centre. September for the best light and fewest people.

## 3. Matira Beach, Bora Bora, French Polynesia
The only public beach on the island, with Mount Otemanu rising behind and a lagoon that changes colour from emerald to sapphire to cobalt across its width.

## 4. Whitehaven Beach, Whitsundays, Australia
98% pure silica sand that stays cool even in midsummer heat. The swirling tidal flats of Hill Inlet, visible from the air, are among the most extraordinary natural patterns in the southern hemisphere.

## 5. Playa de las Catedrales, Galicia, Spain
At low tide, the sea reveals cathedral-like arches carved into the cliffside. At high tide, it disappears entirely. Plan around the tides — there's nothing else like it in Europe.

## Access vs Preservation
The hardest truth about extraordinary beaches: the more people who know about them, the less extraordinary they become. Whitehaven is protected by national park status. Anse Source d'Argent is threatened by development. The best beaches require us to hold them lightly.`,
  },
  {
    id: 6,
    title: "Hiking the Inca Trail: What No Guide Will Tell You",
    excerpt: "After three permits, two altitude-sick nights, and one life-changing sunrise at Machu Picchu — here is the honest truth.",
    category: 'Adventure',
    image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1400&q=80',
    author: 'Carlos Mendez', authorAvatar: 'https://i.pravatar.cc/80?img=13',
    date: 'Mar 15, 2026', readTime: '12 min read',
    tags: ['Peru', 'Hiking', 'Adventure'],
    content: `Every guidebook tells you the Inca Trail is 43 kilometres over four days, reaching 4,215 metres at Dead Woman's Pass, ending at Machu Picchu at sunrise. What they don't tell you is what those four days actually feel like.

## Day 1: The Deception
The first day is easy — 11 kilometres, mostly flat, alongside the Urubamba river. Your porter, who is carrying 25 kilograms, walks faster than you without breathing hard. You feel slightly foolish.

## Day 2: The Truth
Dead Woman's Pass. 1,200 metres of elevation gain in four hours. At 3,800 metres, your legs begin to feel disconnected from your body. At 4,000 metres, a step takes effort that seems disproportionate to its size. At the top, you sit on a rock and look at mountains that go in every direction and think about nothing.

The altitude sickness drugs (Diamox) cause tingling in fingers and toes and make carbonated drinks taste flat. Take them anyway.

## Day 3: The Beauty
The hardest day ends at the best campsite. Cloud forest, orchids, and ruins that have been sitting here for 600 years with almost nobody to see them. The clouds clear for twenty minutes at sunset. This is the day you remember.

## Day 4: The Arrival
The Sun Gate (Inti Punku) at 5:30 AM. The city of Machu Picchu spread out below, catching the first light. You have walked for three days to be in this exact place at this exact moment. No photograph you have ever seen prepared you for the scale, for the green of the terraces, for how quietly extraordinary it is.

## The Permit
Book 12 months in advance. The trail is limited to 500 people per day (including guides and porters). Use a licensed tour operator. There is no other option and there should not be.`,
  },
  {
    id: 7,
    title: "Paris Beyond the Eiffel Tower: A Local's City Guide",
    excerpt: "Skip the queues and discover the arrondissements where Parisians actually eat, drink, and spend their weekends.",
    category: 'City',
    image: 'https://images.unsplash.com/photo-1431274172761-fcdab704a698?auto=format&fit=crop&w=1400&q=80',
    author: 'Isabelle Dubois', authorAvatar: 'https://i.pravatar.cc/80?img=26',
    date: 'Mar 10, 2026', readTime: '9 min read',
    tags: ['Paris', 'City', 'Europe'],
    content: `Paris is the most visited city in the world. It is also, paradoxically, one of the easiest cities in the world in which to feel completely alone. Not in a bad way — alone in the Parisian sense of being self-contained, unhurried, quietly absorbed in a croissant and a newspaper at a zinc-topped bar while the city moves past the window.

The tourist Paris and the real Paris coexist but rarely intersect. This is a guide to the second.

## Le Marais (3rd and 4th Arrondissements)
The most satisfying neighbourhood in Paris for walking. Medieval streets, pre-revolutionary mansions now housing contemporary art galleries, the best falafel in Europe on Rue des Rosiers. Sunday morning: every Parisian in the city seems to converge here.

## Canal Saint-Martin (10th Arrondissement)
Where Parisians under 35 come to sit, drink wine from plastic cups, and watch narrowboats pass through iron locks. On warm evenings, the canal banks fill by 6 PM. Bring a bottle from a nearby cave (wine shop).

## Belleville (11th/20th Arrondissements)
Gentrifying but not yet gentrified. Street art that rivals Berlin. The best Chinese food in Paris. A view of the entire city from Parc de Belleville that tourists have not discovered yet.

## Where to Eat
Avoid restaurants with menus printed in English and photos of the food. Look for a handwritten menu on a chalkboard, a room full of French people, and a fixed-price lunch menu under €20 that includes wine. This restaurant exists in every arrondissement.

## The Rule of One Queue
In Paris, a queue is an endorsement. One queue worth joining: the line outside Du Pain et des Idées on Rue Yves Toudic (closes at 2 PM, sold out of the good things by noon). Their croissants aux amandes are worth restructuring your morning.`,
  },
  {
    id: 8,
    title: "Safari Dreams: A First-Timer's Guide to East Africa",
    excerpt: "Witnessing the Great Migration changed my life. Everything you need to know before your first African safari.",
    category: 'Adventure',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=80',
    author: 'David Osei', authorAvatar: 'https://i.pravatar.cc/80?img=33',
    date: 'Mar 5, 2026', readTime: '11 min read',
    tags: ['Africa', 'Safari', 'Wildlife'],
    content: `The first lion I saw on safari was asleep under an acacia tree, sixty metres from the Land Cruiser. I had expected to feel something dramatic — adrenaline, perhaps, or wonder. What I actually felt was a profound stillness. Like the world had paused.

## The Great Migration
Two million wildebeest, zebra, and gazelle moving in a circular route between Tanzania's Serengeti and Kenya's Masai Mara, following the rain and the grass. The river crossings — where herds plunge into crocodile-filled water — happen June to October on the Kenya side. Book 18 months in advance for the best camps.

## Where to Go
**Tanzania:** The Serengeti is the benchmark. Ngorongoro Crater offers the highest concentration of wildlife per square kilometre on earth. Selous (now Nyerere) in the south is wilder and far less visited.

**Kenya:** The Masai Mara is famous for the migration and the Mara Triangle. Samburu in the north has species you won't find further south: Grevy's zebra, reticulated giraffe, gerenuk.

**Rwanda:** Mountain gorilla trekking in Volcanoes National Park. A permit costs $1,500, a morning with a gorilla family costs the kind of silence that doesn't leave you.

## What to Pack
Neutral colours — khaki, olive, beige. No white (dust) or black (heat). A good zoom lens if you're photographing. Binoculars. A warm layer for early morning game drives.

## The Ethical Question
Safari tourism funds conservation and anti-poaching across millions of acres. Without it, the wildlife areas would be converted to agriculture. Going on safari — done thoughtfully, with ethical operators — is one of the most positive things a traveller can do.`,
  },
  {
    id: 9,
    title: "Street Food Capital: Singapore's Hawker Culture Explained",
    excerpt: "UNESCO heritage, Michelin stars, and $3 chicken rice — Singapore's hawker centres are the greatest food courts on earth.",
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1400&q=80',
    author: 'Wei Lin', authorAvatar: 'https://i.pravatar.cc/80?img=41',
    date: 'Feb 28, 2026', readTime: '6 min read',
    tags: ['Singapore', 'Food', 'Culture'],
    content: `In 2020, UNESCO recognised Singapore's hawker culture as an Intangible Cultural Heritage of Humanity. It was the first time a food tradition from a city-state had received this designation. Anyone who has eaten at Maxwell Food Centre or Lau Pa Sat knows exactly why.

## What is a Hawker Centre?
Covered open-air food markets, government-built and subsidised, where individual stall operators cook a single dish or a small range of dishes, usually passed down through families over generations. There are around 120 hawker centres in Singapore. Each one is a community in itself.

## The Essential Dishes

**Hainanese Chicken Rice** — Singapore's national dish. Poached chicken, fragrant rice cooked in chicken stock, three dipping sauces (chilli, ginger, dark soy). The version at Tian Tian in Maxwell Food Centre has a queue every day at 11 AM.

**Char Kway Teow** — Flat rice noodles wok-fried over extreme heat with prawns, cockles, Chinese sausage, and egg. The fire is as important as the ingredients — this dish cannot be made on a domestic stove.

**Laksa** — A coconut curry noodle soup that exists in two main forms: creamy coconut lemak in Singapore; sour asam in Penang. Both are exceptional.

**Chilli Crab** — Not technically hawker food (the portions are too large, the prices too high), but the single dish that defines Singapore to the outside world. Mud crab in a tomato-chilli sauce. Fried man tou buns to scoop up the sauce.

## The Hawker Way
No table service. Collect a table with a packet of tissues (this is recognised universally as reservation). Order directly at the stall. Return to collect when it's ready. Eat. Everything works on a kind of organised chaos that has been refined over fifty years.

There are Michelin-starred hawker stalls in Singapore. The guides are not wrong. But the genius of hawker culture is that the star is beside the point. The point is the dish, the stall, the family behind it, the queue that vindicates it. The point is the chicken rice.`,
  },
  {
    id: 10,
    title: 'Is Airbnb Still Worth It in 2026?',
    excerpt: 'Hotels have fought back hard. We compare real costs, flexibility, and experience across 12 destinations to give you the honest answer.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
    author: 'Alex Kim',
    authorAvatar: 'https://i.pravatar.cc/80?img=15',
    date: 'Jun 14 2026',
    readTime: '4 min',
    tags: ['Travel Tips', 'Accommodation', 'Hotels'],
    content: `## The Cleaning-Fee Problem
When Airbnb launched, it promised an affordable alternative to hotels. In 2026, a one-night stay in a mid-range Airbnb in Paris can cost more than a four-star hotel once you add the cleaning fee, the service fee, and the city tax. That math has driven millions of travellers back to hotel lobbies.

## What Hotels Got Right
Hotels learned. They added late checkout, better WiFi, contactless check-in, and flexible cancellation. The boutique hotel sector exploded. The hostel sector modernised with private en-suite pods and co-working lounges. Hotels now compete on the very things Airbnb used to own: flexibility and character.

## Where Airbnb Still Wins
Long stays are still Airbnb territory. A two-week rental with a kitchen, washing machine, and a living room cannot be matched by a hotel room. Travelling with a large family or group? Four bedrooms under one roof for a quarter of the per-person cost of separate hotel rooms.

## The Verdict
For a single night or a weekend city break, hotels typically win on value and hassle in 2026. For stays of seven nights or more, or for groups of four or more, Airbnb remains unbeatable. The platform has not died — it has found its lane.

## Tips for Getting Airbnb Value
Book properties with no cleaning fee and at least 100 five-star reviews. Avoid anything less than 4.85 stars — the rating system is inflated. Filter for "self check-in" to avoid awkward key handoff scheduling. Message the host before booking to confirm the actual total cost.`,
  },
  {
    id: 11,
    title: 'Best Travel Credit Cards This Year',
    excerpt: 'The cards that actually earn points fast, offer real lounge access, and have travel insurance that pays out when you need it.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
    author: 'Rachel Torres',
    authorAvatar: 'https://i.pravatar.cc/80?img=25',
    date: 'May 29 2026',
    readTime: '5 min',
    tags: ['Finance', 'Credit Cards', 'Points'],
    content: `## Why Your Debit Card Is Costing You Money
Every flight you book without a travel card is a flight you are not earning miles on. At an average of 1.5 points per dollar and flights costing $800–$1,200, that is 1,200–1,800 points per trip left on the table. Over five trips a year, that is a free business-class upgrade gone.

## The Best All-Round Card
The Chase Sapphire Reserve remains the benchmark for US travellers. The $550 annual fee is offset by a $300 travel credit that applies automatically and Priority Pass lounge access at 1,400+ airports. Points transfer to United, Air France, Hyatt, and 10 other partners at 1:1 — and that is where the real value lies.

## Best for No Annual Fee
The Wells Fargo Autograph earns 3x on travel, dining, and streaming with no annual fee. No foreign transaction fees. Points transfer nowhere — they redeem at 1 cent each — but for travellers who want simple cashback value without paying for a premium card, it delivers consistently.

## Travel Insurance That Actually Pays
The key distinction is "primary" versus "secondary" insurance. Secondary cards reimburse only what your other insurance has already refused. Primary cards (Sapphire Reserve, Capital One Venture X) pay first. Check for: trip cancellation up to $10,000, lost luggage up to $3,000, and medical evacuation up to $100,000.

## The Lounge Access Reality
Priority Pass sounds unlimited, but most premium cards cap free guest access at two per visit. American Express Platinum's Centurion Lounges now require you to book a flight on Amex Travel to enter. Read the current terms before choosing a card based on lounge access alone.`,
  },
  {
    id: 12,
    title: 'How to Travel Solo as a Woman Safely',
    excerpt: 'Practical, honest advice from a woman who has solo-travelled to 60+ countries — covering apps, accommodation, and street smarts.',
    category: 'Adventure',
    image: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=900&q=80',
    author: 'Nina Patel',
    authorAvatar: 'https://i.pravatar.cc/80?img=44',
    date: 'May 12 2026',
    readTime: '8 min',
    tags: ['Solo Travel', 'Safety', 'Women'],
    content: `## The Honest Truth About Risk
Solo female travel carries risk. So does driving a car, living in a city, or working a corporate job. The question is not whether risk exists but whether it is manageable. In over a decade of solo travel across 60 countries, I have been pickpocketed twice, followed once, and never seriously harmed. Risk management is a skill, and it is learnable.

## Accommodation Strategy
Choose your accommodation based on arrival time. Landing after dark? Pay the premium for a hotel with a staffed reception, even if you would prefer a hostel. Well-reviewed hostels with female-only dorms remain excellent choices for meeting people while keeping costs low. Avoid the cheapest option in a new city until you understand the neighbourhood.

## The Apps That Matter
Tourlina connects solo female travellers who want a travel companion for a day. Maps.me works fully offline — download the region before you arrive. Google Translate's camera mode reads menus, signs, and labels in real time. Share your itinerary with a trusted person at home using Google Maps location sharing on a time-limited basis.

## Street Smarts That Work
Walk with purpose. Hesitation signals unfamiliarity. If you are lost, step into a shop or café to check your phone rather than stopping on the pavement. In markets, keep your bag in front of you. On public transport, sit near other women when possible. Trust your instincts: if a situation feels wrong, it is okay to leave without explaining.

## Countries Easier Than You Think
Japan: The world's safest country for solo women. Train stations are labelled in English. Crime is extraordinarily low. Portugal: Friendly, walkable cities, easy public transport, and genuinely welcoming to solo travellers. Colombia (major cities): Safety has transformed dramatically. Medellín and Cartagena now have thriving solo traveller communities.

## The Bigger Picture
The women I meet who struggle most with solo travel are those who prepared for every disaster. The women who thrive are those who planned for the adventure. Carry the right tools, trust yourself, and go.`,
  },
  {
    id: 13,
    title: 'Digital Nomad Visa Countries Ranked',
    excerpt: 'We scored 35 digital nomad visas on cost, speed, internet quality, and quality of life. Here are the clear winners.',
    category: 'Guides',
    image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=900&q=80',
    author: 'Jordan Blake',
    authorAvatar: 'https://i.pravatar.cc/80?img=18',
    date: 'Apr 30 2026',
    readTime: '7 min',
    tags: ['Remote Work', 'Nomad', 'Visa'],
    content: `## Why Digital Nomad Visas Changed Everything
Before 2020, long-term remote working abroad meant either tourist visa hopping (legally grey), expensive local company registration, or simply accepting the overstay risk. The digital nomad visa changed that calculus. Thirty-five countries now offer legal, transparent pathways for remote workers to reside long-term.

## The Scoring Criteria
We scored each visa across five dimensions: application cost, approval speed, income requirement relative to local cost of living, internet quality (measured by median fixed broadband speed), and overall quality of life index. Here are the top performers.

## 1. Portugal (D8 Visa)
**Score: 94/100.** The benchmark. €3,040/month income requirement, one-month approval, pathway to residency after five years. Lisbon and Porto rank in the global top 10 for coworking spaces. Tax incentive for the first 10 years of residency under the NHR regime (check current availability). The only drawback: housing costs in Lisbon have risen sharply.

## 2. Estonia (Digital Nomad Visa)
**Score: 91/100.** Six-month multiple-entry, extendable to one year. €3,504/month income requirement. Estonia has the highest per-capita number of startups in Europe. Tallinn's Old Town provides extraordinary quality of life at lower costs than Lisbon.

## 3. Costa Rica (Rentista/Nomad Visa)
**Score: 88/100.** $3,000/month income requirement. Stable democracy, universal healthcare system, extraordinary biodiversity. The time zone overlap with the US East Coast makes it the best choice for American remote workers who need real-time collaboration.

## 4. Indonesia (Second Home Visa)
**Score: 85/100.** The Bali pathway. Five-year renewable visa requiring IDR 2 billion (~$130,000) in a local bank account. The initial capital requirement is high, but the cost of living is among the lowest of any nomad destination: excellent villa rentals from $600/month, world-class food and wellness infrastructure.

## The Ones to Avoid
Barbados (Welcome Stamp): $2,000 fee for 12 months, no path to residency, banking difficulties for non-nationals. Brazil: Bureaucratic delays averaging four months, inconsistent enforcement. Always read the fine print — several visas marketed as "nomad visas" are in fact modified retirement visas with passive income requirements that exclude most remote employees.`,
  },
];

const RELATED_IDS: Record<number, number[]> = {
  1: [3, 7, 9], 2: [9, 7, 3], 3: [1, 9, 2], 4: [6, 8, 5],
  5: [3, 1, 8], 6: [4, 8, 1], 7: [2, 9, 3], 8: [6, 4, 5], 9: [2, 7, 3],
  10: [11, 1, 3], 11: [10, 1, 7], 12: [13, 1, 7], 13: [12, 11, 1],
};

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="text-2xl font-black text-slate-900 mt-10 mb-4">
          {line.replace('## ', '')}
        </h2>
      );
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <p key={i} className="font-black text-slate-900 text-base mt-5 mb-1">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    }
    const parts = line.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) {
      return (
        <p key={i} className="text-slate-700 leading-relaxed text-lg mb-4">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        </p>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-slate-700 leading-relaxed text-lg mb-4">{line}</p>
    );
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  Guides: 'bg-purple-100 text-purple-700',
  Food: 'bg-amber-100 text-amber-700',
  Adventure: 'bg-emerald-100 text-emerald-700',
  Photography: 'bg-blue-100 text-blue-700',
  Beaches: 'bg-cyan-100 text-cyan-700',
  City: 'bg-rose-100 text-rose-700',
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const staticArticle = ARTICLES.find(a => slugify(a.title) === slug);
  const [remoteArticle, setRemoteArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const article = remoteArticle || staticArticle;
  const related = useMemo(
    () => (staticArticle ? (RELATED_IDS[staticArticle.id] || []).map(rid => ARTICLES.find(a => a.id === rid)).filter(Boolean) as Article[] : []),
    [staticArticle],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const post = await blogService.getBySlug(slug);
        if (!cancelled) {
          setRemoteArticle(mapBlogPostToArticle(post));
        }
      } catch {
        if (!cancelled) {
          setRemoteArticle(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading && !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-slate-500">
        <Clock size={24} className="animate-pulse" />
        <p className="text-sm font-semibold">Loading article...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
        <p className="text-2xl font-black text-slate-900">Article not found</p>
        <Link to="/blogs" className="text-purple-600 underline underline-offset-4">Back to Blog</Link>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[article.category] || 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-screen bg-white">
      {/* ── HERO ── */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <img src={article.image} alt={article.title}
          className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Back button */}
        <button onClick={() => navigate('/blogs')}
          className="absolute top-6 left-6 flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-white/30 transition mt-16">
          <ArrowLeft size={16} /> Back to Blog
        </button>

        {/* Meta */}
        <div className="absolute bottom-0 left-0 right-0 p-8 max-w-4xl mx-auto">
          <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4 ${catColor}`}>
            {article.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <img src={article.authorAvatar} alt={article.author}
              className="w-10 h-10 rounded-full border-2 border-white/40" referrerPolicy="no-referrer" />
            <div>
              <p className="text-white font-semibold text-sm">{article.author}</p>
              <p className="text-white/60 text-xs flex items-center gap-2">
                <Calendar size={11} /> {article.date}
                <span>·</span>
                <Clock size={11} /> {article.readTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">

          {/* Article content */}
          <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {article.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
                  <Tag size={10} /> {t}
                </span>
              ))}
            </div>

            {/* Excerpt */}
            <p className="text-xl text-slate-500 leading-relaxed mb-8 border-l-4 border-purple-400 pl-5 font-medium">
              {article.excerpt}
            </p>

            {/* Full content */}
            <div className="prose-custom">
              {article.content ? renderContent(article.content) : (
                <p className="text-slate-500 italic">Full article coming soon.</p>
              )}
            </div>

            {/* Share row */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-100 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-slate-600">Share this article</p>
                {[
                  { icon: Facebook, label: 'Facebook' },
                  { icon: Twitter, label: 'Twitter' },
                  { icon: Link2, label: 'Copy link' },
                ].map(({ icon: Icon, label }) => (
                  <button key={label} title={label}
                    className="p-2.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-500 rounded-xl transition">
                    <Icon size={16} />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-sm font-semibold transition">
                  <Heart size={15} /> Like
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 rounded-xl text-sm font-semibold transition">
                  <Bookmark size={15} /> Save
                </button>
              </div>
            </div>

            {/* Author card */}
            <div className="mt-10 bg-gradient-to-br from-slate-50 to-purple-50 border border-slate-200 rounded-3xl p-6 flex items-start gap-5">
              <img src={article.authorAvatar} alt={article.author}
                className="w-16 h-16 rounded-2xl border-2 border-white shadow" referrerPolicy="no-referrer" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">Written by</p>
                <p className="font-black text-slate-900 text-lg">{article.author}</p>
                <p className="text-sm text-slate-500 mt-1">Travel writer & photographer. Explores culture, food, and nature across 80+ countries.</p>
              </div>
            </div>
          </motion.article>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-8 mt-0 sticky top-24 self-start">
            {/* Table of contents */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">In this article</p>
              <nav className="space-y-2">
                {article.content?.split('\n').filter(l => l.startsWith('## ')).map(h => (
                  <p key={h} className="text-sm text-slate-600 hover:text-purple-600 cursor-pointer transition pl-3 border-l-2 border-slate-200 hover:border-purple-400">
                    {h.replace('## ', '')}
                  </p>
                ))}
              </nav>
            </div>

            {/* Quick stats */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Details</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={15} className="text-purple-500 shrink-0" />
                  <span className="text-slate-600">{article.readTime}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={15} className="text-purple-500 shrink-0" />
                  <span className="text-slate-600">{article.date}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Globe size={15} className="text-purple-500 shrink-0" />
                  <span className="text-slate-600">{article.category}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-3xl p-6 text-white">
              <MapPin size={20} className="mb-3 text-purple-300" />
              <p className="font-black text-lg mb-2">Plan this trip</p>
              <p className="text-purple-200 text-sm mb-4">Create a personalised itinerary for {article.tags[0]}.</p>
              <Link to="/itinerary"
                className="flex items-center justify-center gap-2 bg-white text-purple-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-purple-50 transition">
                Start Planning <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>

        {/* ── RELATED ARTICLES ── */}
        {related?.length > 0 && (
          <section className="mt-20 pt-12 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Keep reading</p>
            <h2 className="text-2xl font-black text-slate-900 mb-8">Related Stories</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {related.map(rel => rel && (
                <Link key={rel.id} to={`/blogs/${slugify(rel.title)}`}
                  className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="relative h-40 overflow-hidden">
                    <img src={rel.image} alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[rel.category] || 'bg-white text-slate-700'}`}>
                      {rel.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2 mb-2">{rel.title}</h3>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={10} /> {rel.readTime}</span>
                      <span className="flex items-center gap-1 text-purple-600 font-semibold">
                        Read <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
