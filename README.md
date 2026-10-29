# Experience chammanur

A React + Vite front-end prototype for a cinematic community experience around chammanur, Kerala.

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

2. Start the development server:

   ```bash
   npm run dev -- --host
   ```

3. Open the local URL shown in the terminal, usually:

   ```bash
   http://localhost:5173
   ```

## Production build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview -- --host
```

## Project structure

- `App.jsx` – main UI and interactive waypoint logic
- `styles.css` – all design and layout styling
- `main.jsx` – React app entry point
- `vite.config.js` – local dev configuration
- `AdminPage.jsx` – Supabase login, signup request, and admin approval dashboard
- `lib/supabase.js` – Supabase browser client configuration
- `supabase/migrations/` – ordered SQL files to run in Supabase SQL Editor

## Notes

This is a polished Phase 1 prototype built around the requested immersive town journey, searchable directory, and waypoint storytelling experience.

## Map data

The town map uses real OpenStreetMap road and place data through Leaflet. The plotted landmark coordinates were supplied and verified by the site owner: Attupuram Centre (`10.670849, 76.002072`), Chammanoor Centre (`10.675411, 76.020533`), and Amal English School (`10.677212, 76.024398`). Map data is © OpenStreetMap contributors. Use the `SAT` control in the map to compare the plotted points with satellite imagery.

The Punnayurkulam Village Office Plus Code (`MXFX+W46, Punnayurkulam, Kerala 679561`) is intentionally not plotted yet because it has not been converted to a coordinate in the app. This prevents an unverified point from being displayed over a private property.

Framer Motion provides the page entrance reveals, scroll-triggered section transitions, waypoint focus feedback, directory card layout animation, and button micro-interactions.

Vite uses separate production chunks for React, motion, Leaflet, Supabase, and the admin/map routes so the initial page does not load every feature at once.

The admin dashboard can now create, edit, publish, and delete homepage settings, directory listings, landmarks, notices, events, and bus timings. Landmark entries support a custom map label/place number, route ordering, and a `Highlight on the map` toggle; published landmarks become the public map stops. For a landmark location, paste a Google Maps URL, latitude/longitude pair, or full Plus Code; the dashboard detects the format, extracts normalized coordinates, and keeps the original input for traceability. It can also reject signup requests. Upload a new hero image to Supabase Storage from Homepage settings. Public pages load published Supabase listings, landmarks, and homepage settings automatically, with the current prototype content used as a fallback.

Bus timings are managed from Admin → Town content → Bus timings. Published schedules appear in the public Bus timings section.

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
- The public site currently keeps its prototype directory data in React; the prepared content tables are ready for the next migration of public data into Supabase.
