import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase, supabaseConfigured } from './lib/supabase';

const TownMap = lazy(() => import('./components/TownMap'));
const AdminPage = lazy(() => import('./AdminPage'));

const fallbackStops = [
  { id: 'attupuram', name: 'Attupuram Centre', stop_label: 'STOP 01', description: 'A verified point on your local route.', latitude: 10.670849, longitude: 76.002072, route_order: 1, is_map_highlighted: true },
  { id: 'chammanoor', name: 'Chammanoor Centre', stop_label: 'STOP 02', description: 'The heart of the town experience.', latitude: 10.675411, longitude: 76.020533, route_order: 2, is_map_highlighted: true },
  { id: 'school', name: 'Amal English School', stop_label: 'STOP 03', description: 'A verified landmark supplied by you.', latitude: 10.677212, longitude: 76.024398, route_order: 3, is_map_highlighted: true },
];

function isValidCoordinatePair(latitude, longitude) {
  return Number.isFinite(Number(latitude))
    && Number.isFinite(Number(longitude))
    && Math.abs(Number(latitude)) <= 90
    && Math.abs(Number(longitude)) <= 180;
}

function normalizeLandmarks(rows) {
  return rows
    .filter((stop) => isValidCoordinatePair(stop.latitude, stop.longitude))
    .map((stop, index) => ({
      ...stop,
      id: stop.id || `landmark-${index}`,
      name: String(stop.name || 'Unnamed landmark').trim() || 'Unnamed landmark',
      description: String(stop.description || '').trim(),
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      route_order: Number.isFinite(Number(stop.route_order)) ? Number(stop.route_order) : index,
      is_map_highlighted: Boolean(stop.is_map_highlighted),
      stop_label: String(stop.stop_label || `STOP ${String(index + 1).padStart(2, '0')}`).trim(),
    }));
}

const directoryData = [
  ['Banks', 'State Bank of India', 'Punnayurkulam branch · Althara'],
  ['Schools', 'Amal English School', 'chammanur · Via Punnayurkulam'],
  ['Services', 'chammanur Post Office', 'PIN 679561 · Local services'],
  ['Banks', 'South Indian Bank', 'Punnayurkulam branch'],
  ['Health', 'Medical Shop', 'Add your trusted local listing'],
  ['Transport', 'Auto / Taxi Stand', 'Add contact and stand location'],
];
const busTimingFallback = [
  { route_name: 'Chammanoor → Guruvayur', direction: 'To Guruvayur', departure_time: '06:20', arrival_time: '07:05', via: 'Punnayurkulam · Chavakkad', operating_days: 'Daily' },
  { route_name: 'Chammanoor → Ponnani', direction: 'To Ponnani', departure_time: '07:10', arrival_time: '08:15', via: 'Althara · Vadakkekad', operating_days: 'Daily' },
  { route_name: 'Guruvayur → Chammanoor', direction: 'Towards Chammanoor', departure_time: '17:30', arrival_time: '18:15', via: 'Chavakkad · Punnayurkulam', operating_days: 'Mon–Sat' },
];

const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

function PublicSite() {
  const [activeStop, setActiveStop] = useState('attupuram');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [siteSettings, setSiteSettings] = useState({});
  const [directoryEntries, setDirectoryEntries] = useState(directoryData);
  const [busTimings, setBusTimings] = useState(busTimingFallback);
  const [mapStops, setMapStops] = useState(fallbackStops);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    Promise.all([
      supabase.from('entechemmanur_site_settings').select('key, value'),
      supabase.from('entechemmanur_directory_listings').select('category, name, description').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('entechemmanur_bus_timings').select('route_name, direction, departure_time, arrival_time, via, operating_days').eq('is_published', true).order('departure_time'),
      supabase.from('entechemmanur_landmarks').select('id, name, description, stop_label, latitude, longitude, route_order, is_map_highlighted').eq('is_published', true).order('route_order').order('created_at'),
    ]).then(([settingsResult, listingsResult, busResult, landmarksResult]) => {
      if (!settingsResult.error) setSiteSettings(Object.fromEntries((settingsResult.data || []).map(({ key, value }) => [key, value])));
      if (!listingsResult.error && listingsResult.data?.length) setDirectoryEntries(listingsResult.data.map(({ category: group, name, description }) => [group, name, description || '']));
      if (!busResult.error && busResult.data?.length) setBusTimings(busResult.data);
      if (!landmarksResult.error) {
        const validLandmarks = normalizeLandmarks(landmarksResult.data || []);
        if (validLandmarks.length) setMapStops(validLandmarks);
      }
    });
    return undefined;
  }, []);

  const categories = useMemo(() => ['All', ...new Set(directoryEntries.map(([group]) => group))], [directoryEntries]);

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    return directoryEntries.filter(([group, title, description]) => {
      const matchesCategory = category === 'All' || group === category;
      const matchesQuery = !term || `${group} ${title} ${description}`.toLowerCase().includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, directoryEntries]);

  const moveToNextStop = () => {
    const currentIndex = mapStops.findIndex((stop) => stop.id === activeStop);
    const nextStop = mapStops[(currentIndex + 1) % mapStops.length];
    setActiveStop(nextStop.id);
  };

  const stops = mapStops.map((stop) => stop.id);
  useEffect(() => {
    if (mapStops.length && !mapStops.some((stop) => stop.id === activeStop)) {
      setActiveStop(mapStops[0].id);
    }
  }, [activeStop, mapStops]);

  const stopMeta = Object.fromEntries(mapStops.map((stop) => [stop.id, {
    label: stop.name,
    stopLabel: stop.stop_label || 'STOP',
    tagline: `${stop.latitude}, ${stop.longitude} · ${stop.description || 'A local stop on the Chammanur route.'}`,
  }]));
  const selectedStop = stopMeta[activeStop] ? activeStop : stops[0];
  const locations = Object.fromEntries(mapStops.map((stop) => [stop.id, {
    coordinates: [stop.latitude, stop.longitude],
    label: stop.name,
    stopLabel: stop.stop_label,
    note: stop.description || 'A published Chammanur stop',
    isHighlighted: stop.is_map_highlighted,
  }]));

  return (
    <>
      <header className="hero" id="top" style={siteSettings.hero_image_url ? { backgroundImage: `linear-gradient(180deg, rgba(6, 23, 20, 0.25), rgba(6, 23, 20, 0.88) 90%), url("${siteSettings.hero_image_url}")` } : undefined}>
        <div className="container">
          <div className="nav">
            <a className="brand" href="#top">
              CHAMMAN<span>U</span>R<span>.</span>
            </a>

            <nav className="navlinks" aria-label="Main navigation">
              <a href="#journey">The journey</a>
              <a href="#directory">Directory</a>
              <a href="#bus-timings">Bus timings</a>
              <a href="#stories">Stories</a>
              <a href="#contact">Contribute</a>
            </nav>

            <motion.button className="menu" type="button" aria-label="Open menu" whileTap={{ scale: 0.88 }}>
              ☰
            </motion.button>
          </div>

          <motion.div
            className="hero-content"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div className="eyebrow" variants={reveal}>{siteSettings.hero_eyebrow || 'A living map of Kerala · 10°40′N 76°02′E'}</motion.div>
            <motion.h1 variants={reveal}>{siteSettings.hero_title || 'Find your way back home.'}</motion.h1>
            <motion.p className="hero-copy" variants={reveal}>
              {siteSettings.hero_description || 'A new way to experience Chammanoor — its green roads, familiar landmarks and the people who make this place feel like home.'}
            </motion.p>
            <motion.a className="primary" href="#journey" variants={reveal} whileHover={{ y: -4, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              Start the journey
            </motion.a>
          </motion.div>
        </div>
        <div className="scroll-cue">Scroll to explore</div>
      </header>

      <main>
        <motion.section className="explore" id="journey" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} variants={stagger}>
          <div className="container">
            <motion.div className="explore-head" variants={reveal}>
              <div>
                <div className="kicker">01 / Roaming around town</div>
                <h2 className="title">
                  Take the scenic route
                  <br />
                  <em>through chammanur.</em>
                </h2>
              </div>
              <p>
                Follow the road from Punnayurkulam Junction into the heart of our town. Tap a marker to pause.
              </p>
            </motion.div>

            <motion.div className="map-stage" id="map" variants={reveal}>
              <div className="map-ui">
                <div className="map-status">
                  <i className="live"></i>
                  Live route · {mapStops.filter((stop) => stop.is_map_highlighted).length} highlighted stops
                </div>
              </div>

              <Suspense fallback={<div className="map-loading">Loading live map…</div>}>
                <TownMap activeStop={selectedStop} onSelectStop={setActiveStop} locations={locations} />
              </Suspense>

              <div className="map-footer">
                <p>
                  Currently exploring: <strong>{stopMeta[selectedStop].label}</strong>
                </p>
                <motion.button type="button" onClick={moveToNextStop} whileHover={{ x: 5 }} whileTap={{ scale: 0.96 }}>
                  Next stop&nbsp; →
                </motion.button>
              </div>
            </motion.div>

            <motion.div className="waypoints" id="waypointList" variants={stagger}>
              {stops.map((key, index) => (
                <motion.article
                  key={key}
                  className="waypoint"
                  data-card={key}
                  style={{ opacity: selectedStop === key ? 1 : 0.48 }}
                  onClick={() => setActiveStop(key)}
                  variants={reveal}
                  whileHover={{ x: 8, opacity: 1 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="waypoint-number">{stopMeta[key].stopLabel}</div>
                  <div>
                    <h3>{stopMeta[key].label}</h3>
                    <p>{stopMeta[key].tagline}</p>
                  </div>
                  <motion.button className="waypoint-action" type="button" aria-label={`Show ${stopMeta[key].label} on map`} whileHover={{ rotate: 45 }} whileTap={{ scale: 0.88 }}>
                    ↗
                  </motion.button>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </motion.section>

        <motion.section className="directory" id="directory" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.16 }} variants={stagger}>
          <div className="container">
            <motion.div className="directory-header" variants={reveal}>
              <div>
                <div className="kicker">02 / Find your people</div>
                <h2 className="title">
                  The local
                  <br />
                  <em>directory.</em>
                </h2>
              </div>
              <p>Useful places, familiar faces and everything you need — all in one place.</p>
            </motion.div>

            <motion.input
              className="search"
              type="search"
              placeholder="Search the directory…"
              aria-label="Search the directory"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              variants={reveal}
              whileFocus={{ scale: 1.01 }}
            />

            <motion.div className="filters" variants={reveal}>
              {categories.map((item) => (
                <motion.button
                  key={item}
                  type="button"
                  className={`filter ${category === item ? 'active' : ''}`}
                  onClick={() => setCategory(item)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item}
                </motion.button>
              ))}
            </motion.div>

            <motion.div className="directory-grid" variants={stagger}>
              <AnimatePresence mode="popLayout">
              {filteredData.length > 0 ? (
                filteredData.map(([group, title, description]) => (
                  <motion.article
                    key={`${group}-${title}`}
                    className="directory-card"
                    variants={reveal}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.96 }}
                    layout
                    whileHover={{ y: -7, boxShadow: '0 18px 34px rgba(23, 59, 49, 0.11)' }}
                  >
                    <div className="kicker">{group}</div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <small>Explore listing&nbsp; ↗</small>
                  </motion.article>
                ))
              ) : (
                <motion.p className="no-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>No listings found. Try another search.</motion.p>
              )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.section>

        <motion.section className="buses" id="bus-timings" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.16 }} variants={stagger}>
          <div className="container">
            <motion.div className="directory-header" variants={reveal}>
              <div><div className="kicker">03 / Travel locally</div><h2 className="title">Bus <em>timings.</em></h2></div>
              <p>Useful departure times for journeys through Chammanoor. Confirm timings locally before travelling.</p>
            </motion.div>
            <motion.div className="bus-grid" variants={stagger}>
              {busTimings.map((bus) => (
                <motion.article className="bus-card" key={`${bus.route_name}-${bus.departure_time}`} variants={reveal} whileHover={{ y: -5 }}>
                  <div className="bus-time">{bus.departure_time?.slice(0, 5)}</div>
                  <div><h3>{bus.route_name}</h3><p>{bus.direction} · {bus.operating_days}</p><small>{bus.via || 'Local route'}{bus.arrival_time ? ` · Arrives ${bus.arrival_time.slice(0, 5)}` : ''}</small></div>
                </motion.article>
              ))}
            </motion.div>
            <p className="bus-note">Times are community-maintained and may change. Please verify at the stop or with the operator.</p>
          </div>
        </motion.section>

        <motion.section id="stories" className="stories" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9 }}>
          <div className="container">
            <div className="kicker">03 / A place with stories</div>
            <motion.h2 className="title title-story" initial={{ y: 24 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: 'easeOut' }}>
              Every road has
              <br />
              <em>a memory.</em>
            </motion.h2>
          </div>
        </motion.section>
      </main>

      <footer id="contact">
        <div className="container">
          <strong>CHAMMANUR.</strong>
          <br />
          <span>
            Built with care for the people of chammanur · {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#admin');

  useEffect(() => {
    const handleHashChange = () => setIsAdminRoute(window.location.hash === '#admin');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <Suspense fallback={<main className="admin-shell"><div className="admin-auth-card"><p className="admin-muted">Loading Chammanoor…</p></div></main>}>
      {isAdminRoute ? <AdminPage /> : <PublicSite />}
    </Suspense>
  );
}
