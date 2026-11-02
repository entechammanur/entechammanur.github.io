# Chammanur public town guide

A React + Vite public guide to Chammanur, Kerala. The site brings published local places, public representatives, landmarks, transport information, notices, events, and location details together without filling gaps with invented data.

## Tech stack

- React
- Vite
- React Leaflet
- Framer Motion
- OpenStreetMap tiles

This stack is a strong fit for a rich interactive landing page because it gives you:

- fast local development
- easy component-driven structure
- strong ecosystem support
- simple deployment to static hosting or a modern frontend platform

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server on this computer:

   ```bash
   npm run dev
   ```

3. Open the local URL shown in the terminal, usually:

   ```bash
   http://localhost:5173
   ```

   Vite uses port 5173 when available and automatically tries another port if it is occupied.

To test on another device on the same network, run:

```bash
npm run dev:host
```

Open the `Network` URL printed by Vite on that device. If it cannot connect, allow Node.js through Windows Firewall on your private network.

## Production build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview -- --host
```

## Project structure

- `App.jsx` – public guide, published content loading, and admin-route switch
- `styles.css` – all design and layout styling
- `main.jsx` – React app entry point
- `vite.config.js` – local dev configuration
- `AdminPage.jsx` – Supabase login, signup request, and admin approval dashboard
- `lib/supabase.js` – Supabase browser client configuration
- `supabase/migrations/` – ordered SQL files to run in Supabase SQL Editor

## Public information

- The homepage uses the supplied aerial photograph and lets administrators replace it.
- Published directory entries power the searchable places and representatives sections. Add places under Admin → Places; add representatives separately under Admin → People. The People form saves records in the existing `Leadership` category for compatibility.
- Directory records support phone, WhatsApp, coordinates, and an optional portrait. Admins can upload a portrait to Supabase Storage or provide a hosted photo URL.
- Bus schedules are entered with separate hour, minute, and AM/PM selectors; admins can set the bus name, route, final stop, destination group, optional contact number, and daily or selected operating days. The destination group controls which side-by-side public schedule heading the bus appears under; admins can reuse an existing group or enter a new one. Apply migrations 11 and 12 in Supabase before saving these fields.
- Published landmarks appear on the interactive map. Notices and upcoming events appear only when administrators publish them. Bus schedules show published records only.
- Unpublished records and missing data are not replaced with sample listings, people, or schedules.
- The about section uses editable homepage settings. The map fallback includes only the owner-supplied landmark coordinates described below.

## Map data

The town map uses OpenStreetMap road data through Leaflet and requests road-following route geometry from the public OSRM routing service. Published landmarks are routed in their configured route order; if routing is unavailable, the map keeps its markers and reports that the route line could not be loaded rather than drawing a misleading straight line. The plotted fallback coordinates were supplied and verified by the site owner: Attupuram Centre (`10.670849, 76.002072`), Chammanur Centre (`10.675411, 76.020533`), and Amal English School (`10.677212, 76.024398`). Map data is © OpenStreetMap contributors. Marker labels show names only; details appear in the landmark list. The map zoom changes only when visitors tap its `+` or `−` controls; scrolling, selecting landmarks, double-clicking, and touch gestures do not zoom it. Use the `SAT` control to compare plotted points with satellite imagery.

The Punnayurkulam Village Office Plus Code (`MXFX+W46, Punnayurkulam, Kerala 679561`) is intentionally not plotted yet because it has not been converted to a coordinate in the app. This prevents an unverified point from being displayed over a private property.

Vite uses separate production chunks for React, motion, Leaflet, Supabase, and the admin/map routes so the initial page does not load every feature at once.

The admin dashboard can create, edit, publish, and delete homepage settings, places, representatives, landmarks, notices, events, and bus timings. Landmark entries support a custom map label, route order, and a `Highlight on the map` option. Enter coordinates in latitude, longitude order (for example `10.67085, 76.00207`), use a full Google Maps URL containing coordinates, or enter a full Plus Code. Short Google Maps links cannot be resolved by the form; open the place in Maps and copy its coordinates instead. Admins can also approve signup requests and upload homepage or directory photos to Supabase Storage.

Update the About text under Admin → Homepage. Manage places under Admin → Places and representatives under Admin → People. The public pages show only content marked as published.

## Supabase setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run these files in order:

   ```text
   supabase/migrations/01-create-admin-access.sql
   supabase/migrations/02-create-content-tables.sql
   supabase/migrations/03-content-policies.sql
   supabase/migrations/05-create-site-settings-and-storage.sql
   supabase/migrations/06-create-bus-timings.sql
   supabase/migrations/07-add-map-stop-controls.sql
   supabase/migrations/08-add-bus-name.sql
   supabase/migrations/09-add-about-section-settings.sql
   supabase/migrations/10-add-directory-photos.sql
   supabase/migrations/11-add-bus-details.sql
   ```

   Run `04-promote-admin-by-email.sql` separately only when promoting a real account, after replacing its email.

3. Copy `.env.example` to `.env.local`.
4. Add the project URL and public anon key from Supabase:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-key
   ```

5. Restart the Vite server.
6. Open the admin page at:

   ```text
   http://localhost:5173/#admin
   ```

### First administrator

Use the signup form to create the first account. Then open `supabase/migrations/04-promote-admin-by-email.sql`, replace only `admin@example.com` with the account email, and run it in Supabase SQL Editor. That promotes the account into `entechemmanur_admin_users` without needing the user ID, name, or any other value.

After that, future people can use the signup form. Their request is automatically recorded in `entechemmanur_signup_requests`, and an existing administrator can promote them from the dashboard.

### Security model

- Every application table starts with `entechemmanur_`.
- Admin access is checked against `entechemmanur_admin_users`.
- Row Level Security policies protect admin and content tables.
- The browser uses only the Supabase public anon key.
- Admin passwords must be at least 6 characters, matching the configured Supabase Auth minimum.
- Never put a Supabase `service_role` key in `.env.local` or frontend code.
- Directory photos use the existing public `entechemmanur_media` storage bucket. Apply migration `10-add-directory-photos.sql` before using the photo field with an existing project.
