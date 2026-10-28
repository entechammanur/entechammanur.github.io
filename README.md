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

## Notes

This is a polished Phase 1 prototype built around the requested immersive town journey, searchable directory, and waypoint storytelling experience.

## Map data

The town map uses real OpenStreetMap road and place data through Leaflet. The plotted landmark coordinates were supplied and verified by the site owner: Attupuram Centre (`10.670849, 76.002072`), Chammanoor Centre (`10.675411, 76.020533`), and Amal English School (`10.677212, 76.024398`). Map data is © OpenStreetMap contributors. Use the `SAT` control in the map to compare the plotted points with satellite imagery.

The Punnayurkulam Village Office Plus Code (`MXFX+W46, Punnayurkulam, Kerala 679561`) is intentionally not plotted yet because it has not been converted to a coordinate in the app. This prevents an unverified point from being displayed over a private property.

Framer Motion provides the page entrance reveals, scroll-triggered section transitions, waypoint focus feedback, directory card layout animation, and button micro-interactions.
