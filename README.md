# Experience chammanur

A React + Vite front-end prototype for a cinematic community experience around chammanur, Kerala.

## Tech stack

- React
- Vite
- React Leaflet
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

The town map uses real OpenStreetMap road and place data through Leaflet. The landmark coordinates are based on mapped locations in the Chammanoor/Punnayurkulam area: State Bank of India and Punnayurkulam Post Office at Moonnamkallu/Althara, plus Amal English School on the Vadakkakad-Chammanoor Athirth Road. Map data is © OpenStreetMap contributors. Use the `SAT` control in the map to compare the plotted points with satellite imagery.
