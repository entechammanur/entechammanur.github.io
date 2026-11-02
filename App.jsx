import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase';
import { defaultAboutSettings } from './lib/siteSettings';
import GlassHeader from './components/GlassHeader';

const TownMap = lazy(() => import('./components/TownMap'));
const AdminPage = lazy(() => import('./AdminPage'));

const fallbackStops = [
  { id: 'attupuram', name: 'Attupuram Centre', stop_label: 'Stop 01', description: 'A verified point on the local route.', latitude: 10.670849, longitude: 76.002072, route_order: 1, is_map_highlighted: true },
  { id: 'chammanur', name: 'Chammanur Centre', stop_label: 'Stop 02', description: 'A verified point on the local route.', latitude: 10.675411, longitude: 76.020533, route_order: 2, is_map_highlighted: true },
  { id: 'school', name: 'Amal English School', stop_label: 'Stop 03', description: 'A verified local landmark.', latitude: 10.677212, longitude: 76.024398, route_order: 3, is_map_highlighted: true },
];

function isValidCoordinatePair(latitude, longitude) {
  if (latitude == null || longitude == null || String(latitude).trim() === '' || String(longitude).trim() === '') {
    return false;
  }
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  return Number.isFinite(numericLatitude)
    && Number.isFinite(numericLongitude)
    && Math.abs(numericLatitude) <= 90
    && Math.abs(numericLongitude) <= 180;
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
      stop_label: String(stop.stop_label || `Stop ${String(index + 1).padStart(2, '0')}`).trim(),
    }));
}

function isLeadershipEntry(entry) {
  const category = String(entry.category || '').toLowerCase();
  return ['leadership', 'representative', 'ward member', 'panchayat'].some((term) => category.includes(term));
}

function matchesSearch(term, ...values) {
  return !term || values.filter(Boolean).join(' ').toLowerCase().includes(term);
}

function SkeletonCards({ count = 3 }) {
  return (
    <div className="loading-list" role="status" aria-label="Loading public information">
      {Array.from({ length: count }, (_, index) => <span className="loading-line" key={index} />)}
    </div>
  );
}

function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatBusTime(value) {
  if (!value) return 'Time unavailable';
  const [hourPart, minutePart = '00'] = String(value).split(':');
  const hour24 = Number(hourPart);
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) return String(value);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(Number(minutePart) || 0).padStart(2, '0')} ${period}`;
}

function DirectoryRecord({ entry, person = false }) {
  const phone = String(entry.phone || '').replace(/[^\d+*#,;]/g, '');
  const whatsapp = String(entry.whatsapp || '').replace(/\D/g, '');
  const coordinates = isValidCoordinatePair(entry.latitude, entry.longitude)
    ? `${Number(entry.latitude)},${Number(entry.longitude)}`
    : '';
  const mapUrl = coordinates
    ? `https://www.openstreetmap.org/?mlat=${Number(entry.latitude)}&mlon=${Number(entry.longitude)}#map=16/${coordinates}`
    : '';

  return (
    <article className={`directory-record${person ? ' directory-record-person' : ''}`}>
      {entry.photo_url && (
        <img
          className="record-photo"
          src={entry.photo_url}
          alt={`Photo of ${entry.name}`}
          width="640"
          height="480"
          loading="lazy"
        />
      )}
      <div className="record-copy">
        <p className="record-category">{person ? 'Community representative' : entry.category}</p>
        <h3>{entry.name}</h3>
        {entry.description && <p className="record-description">{entry.description}</p>}
        {entry.address && <p className="record-address">{entry.address}</p>}
        {(phone || whatsapp || mapUrl) && (
          <div className="record-actions">
            {phone && <a href={`tel:${phone}`}>Call</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer">View location</a>}
          </div>
        )}
      </div>
    </article>
  );
}

function PublicSite() {
  const [activeStop, setActiveStop] = useState('attupuram');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [siteSettings, setSiteSettings] = useState({});
  const [directoryEntries, setDirectoryEntries] = useState([]);
  const [busTimings, setBusTimings] = useState([]);
  const [mapStops, setMapStops] = useState(fallbackStops);
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [isContentLoading, setIsContentLoading] = useState(supabaseConfigured);
  const [contentLoadError, setContentLoadError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let isActive = true;

    const loadPublicContent = async () => {
      try {
        const results = await Promise.all([
          supabase.from('entechemmanur_site_settings').select('key, value'),
          supabase.from('entechemmanur_directory_listings').select('id, category, name, description, phone, whatsapp, address, latitude, longitude, photo_url').eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('entechemmanur_bus_timings').select('id, bus_name, route_name, direction, departure_time, arrival_time, via, operating_days, last_stop, contact_number, route_group').eq('is_published', true).order('departure_time'),
          supabase.from('entechemmanur_landmarks').select('id, name, description, stop_label, latitude, longitude, route_order, is_map_highlighted').eq('is_published', true).order('route_order').order('created_at'),
          supabase.from('entechemmanur_notices').select('id, title, body, severity, published_until').eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('entechemmanur_events').select('id, title, description, starts_at, ends_at, venue').eq('is_published', true).order('starts_at'),
        ]);
        if (!isActive) return;

        const [settingsResult, initialListingsResult, initialBusResult, landmarksResult, noticesResult, eventsResult] = results;
        let listingsResult = initialListingsResult;
        let busResult = initialBusResult;
        let photoMigrationMissing = false;
        if (
          listingsResult.error?.code === '42703'
          && /column .*\.photo_url does not exist/.test(listingsResult.error.message || '')
        ) {
          listingsResult = await supabase
            .from('entechemmanur_directory_listings')
            .select('id, category, name, description, phone, whatsapp, address, latitude, longitude')
            .eq('is_published', true)
            .order('created_at', { ascending: false });
          photoMigrationMissing = !listingsResult.error;
        }
        let busDetailsMigrationMissing = false;
        let busRouteGroupsMigrationMissing = false;
        if (
          ['42703', 'PGRST204'].includes(busResult.error?.code)
          && /last_stop|contact_number|route_group/.test(busResult.error.message || '')
        ) {
          busDetailsMigrationMissing = /last_stop|contact_number/.test(busResult.error.message || '');
          busRouteGroupsMigrationMissing = /route_group/.test(busResult.error.message || '');
          busResult = await supabase
            .from('entechemmanur_bus_timings')
            .select('id, bus_name, route_name, direction, departure_time, arrival_time, via, operating_days')
            .eq('is_published', true)
            .order('departure_time');
        }
        if (!isActive) return;

        if (!settingsResult.error) {
          setSiteSettings(Object.fromEntries((settingsResult.data || []).map(({ key, value }) => [key, value])));
        }
        if (!listingsResult.error) setDirectoryEntries(listingsResult.data || []);
        if (!busResult.error) setBusTimings(busResult.data || []);
        if (!landmarksResult.error) {
          const validLandmarks = normalizeLandmarks(landmarksResult.data || []);
          if (validLandmarks.length) setMapStops(validLandmarks);
        }

        const now = Date.now();
        if (!noticesResult.error) {
          setNotices((noticesResult.data || []).filter((notice) => (
            !notice.published_until || new Date(notice.published_until).getTime() >= now
          )));
        }
        if (!eventsResult.error) {
          setEvents((eventsResult.data || []).filter((event) => (
            event.ends_at
              ? new Date(event.ends_at).getTime() >= now
              : new Date(event.starts_at).getTime() >= now
          )));
        }

        const queryErrors = [settingsResult, listingsResult, busResult, landmarksResult, noticesResult, eventsResult]
          .filter(({ error }) => error)
          .map(({ error }) => error);
        const warnings = [];
        if (photoMigrationMissing) {
          warnings.push('Directory listings are available, but profile photos need database migration 10.');
        }
        if (busDetailsMigrationMissing) {
          warnings.push('Bus schedules are available, but last stops and contact numbers need database migration 11.');
        }
        if (busRouteGroupsMigrationMissing) {
          warnings.push('Bus destination groups need database migration 12.');
        }
        if (queryErrors.length) {
          console.error('Some Chammanur public information could not be refreshed.', queryErrors);
          warnings.push('Some public information could not be refreshed. The sections that loaded are still available.');
        }
        setContentLoadError(warnings.join(' '));
      } catch (error) {
        if (!isActive) return;
        console.error('Chammanur public information could not be loaded.', error);
        setContentLoadError('Public information could not be loaded. Please try again later.');
      } finally {
        if (isActive) setIsContentLoading(false);
      }
    };

    void loadPublicContent();
    return () => { isActive = false; };
  }, []);

  const categories = useMemo(
    () => ['All', ...new Set(directoryEntries.map((entry) => entry.category).filter(Boolean))],
    [directoryEntries],
  );
  const filteredEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    return directoryEntries.filter((entry) => {
      const matchesCategory = category === 'All' || entry.category === category;
      const matchesQuery = matchesSearch(term,
        entry.name,
        entry.category,
        entry.description,
        entry.address,
        entry.phone,
        entry.whatsapp,
      );
      return matchesCategory && matchesQuery;
    });
  }, [category, query, directoryEntries]);

  const searchTerm = query.trim().toLowerCase();
  const filteredLandmarks = mapStops.filter((stop) => matchesSearch(searchTerm, stop.name, stop.description, stop.stop_label, stop.latitude, stop.longitude));
  const filteredBusTimings = busTimings.filter((bus) => matchesSearch(
    searchTerm,
    bus.bus_name,
    bus.route_name,
    bus.route_group,
    bus.last_stop,
    bus.contact_number,
    bus.direction,
    bus.via,
    bus.operating_days,
    bus.departure_time,
  ));
  const filteredNotices = notices.filter((notice) => matchesSearch(searchTerm, notice.title, notice.body, notice.severity));
  const filteredEvents = events.filter((event) => matchesSearch(searchTerm, event.title, event.description, event.venue));
  const busGroups = Array.from(filteredBusTimings.reduce((groups, bus) => {
    const routeGroup = String(bus.route_group || bus.last_stop || bus.direction || 'Other destinations').trim();
    if (!groups.has(routeGroup)) groups.set(routeGroup, { routeGroup, buses: [] });
    groups.get(routeGroup).buses.push(bus);
    return groups;
  }, new Map()).values());

  const people = filteredEntries.filter(isLeadershipEntry);
  const places = filteredEntries.filter((entry) => !isLeadershipEntry(entry));
  const hasPeople = directoryEntries.some(isLeadershipEntry);
  const selectedStop = mapStops.some((stop) => stop.id === activeStop) ? activeStop : mapStops[0]?.id;
  const locations = Object.fromEntries(mapStops.map((stop) => [stop.id, {
    coordinates: [stop.latitude, stop.longitude],
    label: stop.name,
    isHighlighted: stop.is_map_highlighted,
  }]));
  const about = { ...defaultAboutSettings, ...siteSettings };

  const moveToNextStop = () => {
    const currentIndex = mapStops.findIndex((stop) => stop.id === selectedStop);
    const nextStop = mapStops[(currentIndex + 1) % mapStops.length];
    if (nextStop) setActiveStop(nextStop.id);
  };

  return (
    <>
      <GlassHeader hasPeople={hasPeople} hasUpdates={events.length > 0} hasNotices={notices.length > 0} />
      <header className="hero" id="top">
        <div className="container hero-layout">
          <div className="hero-copy">
            <p className="hero-eyebrow">{siteSettings.hero_eyebrow || 'Chammanur, Punnayurkulam, Kerala'}</p>
            <h1>{siteSettings.hero_title || 'Chammanur.'}</h1>
            <p>{siteSettings.hero_description || 'Punnayurkulam, Kerala.'}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#directory">Find information</a>
              <a className="button button-secondary" href="#places">Explore the map</a>
            </div>
          </div>
          <figure className="hero-figure">
            <img
              src={siteSettings.hero_image_url || '/images/entechammanurhome.png'}
              alt={siteSettings.hero_image_url ? 'A view of Chammanur' : 'Aerial view of a tree-lined road in Chammanur'}
              width="1920"
              height="2560"
              fetchpriority="high"
            />
            <figcaption>Chammanur, Kerala</figcaption>
          </figure>
        </div>
      </header>

      <main>
        {contentLoadError && <p className="content-warning" role="status">{contentLoadError}</p>}

        {notices.length > 0 && (
          <section className="notices" id="notices" aria-labelledby="notices-title">
            <div className="container">
              <h2 id="notices-title">Public notices</h2>
              <div className="notice-list">
                {filteredNotices.length > 0 ? filteredNotices.map((notice) => (
                  <article className="notice-row" key={notice.id}>
                    <p className="notice-kind">{notice.severity === 'urgent' ? 'Urgent notice' : notice.severity === 'important' ? 'Important notice' : 'Community notice'}</p>
                    <h3>{notice.title}</h3>
                    <p>{notice.body}</p>
                  </article>
                )) : <p className="empty-line">No notices match this search.</p>}
              </div>
            </div>
          </section>
        )}

        <section className="directory section-pad" id="directory">
          <div className="container">
            <div className="section-heading">
              <div>
                <h2>Find local information</h2>
                <p>Search published places, services and community representatives.</p>
              </div>
            </div>

            <label className="search-label" htmlFor="town-search">Search public information</label>
            <input
              className="search"
              id="town-search"
              type="search"
              placeholder="Place, person, landmark, route or event"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <div className="filters" aria-label="Filter directory by category">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`filter${category === item ? ' active' : ''}`}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {isContentLoading ? <SkeletonCards /> : filteredEntries.length === 0 ? (
              <div className="empty-state" role="status">
                <h3>{directoryEntries.length === 0 && !query ? 'The directory is ready for local information.' : 'No matching places or people.'}</h3>
                <p>{directoryEntries.length === 0 && !query ? 'Published listings will appear here when an administrator adds them.' : 'Other matching information appears in its section below. Try another search or clear the category.'}</p>
                {directoryEntries.length > 0 && (
                  <button className="button button-secondary" type="button" onClick={() => { setQuery(''); setCategory('All'); }}>
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                {places.length > 0 && (
                  <div className="directory-group">
                    <h3 className="group-heading">Places and services</h3>
                    <div className="directory-grid">
                      {places.map((entry) => <DirectoryRecord entry={entry} key={entry.id} />)}
                    </div>
                  </div>
                )}
                {people.length > 0 && (
                  <div className="directory-group people-group" id="people">
                    <h3 className="group-heading">Public representatives</h3>
                    <p className="group-intro">Contact and ward information appears only when published by an administrator.</p>
                    <div className="people-grid">
                      {people.map((entry) => <DirectoryRecord entry={entry} person key={entry.id} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="places-section section-pad" id="places">
          <div className="container">
            <div className="section-heading">
              <div>
                <h2>Landmarks and routes</h2>
                <p>Choose a published stop to see where it sits on the map.</p>
              </div>
            </div>

            <div className="map-stage">
              <Suspense fallback={<div className="map-loading" role="status">Loading the town map…</div>}>
                <TownMap activeStop={selectedStop} onSelectStop={setActiveStop} locations={locations} />
              </Suspense>
            </div>
            <div className="map-footer">
              <p>Selected place: <strong>{mapStops.find((stop) => stop.id === selectedStop)?.name || 'Chammanur'}</strong></p>
              <button className="text-button" type="button" onClick={moveToNextStop}>Next landmark</button>
            </div>
            <ol className="landmark-list">
              {filteredLandmarks.map((stop) => (
                <li key={stop.id}>
                  <button
                    className="landmark-button"
                    type="button"
                    aria-pressed={selectedStop === stop.id}
                    onClick={() => setActiveStop(stop.id)}
                  >
                    <span className="landmark-name">{stop.name}</span>
                    <span className="landmark-description">{stop.description || 'Published local landmark'}</span>
                    <span className="landmark-coordinate">{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</span>
                  </button>
                </li>
              ))}
            </ol>
            {filteredLandmarks.length === 0 && <p className="empty-line">No landmarks match this search.</p>}
          </div>
        </section>

        <section className="transport section-pad" id="bus-timings">
          <div className="container">
            <div className="section-heading">
              <div>
                <h2>Bus information</h2>
                <p>Schedules are maintained by local administrators. Confirm before travelling.</p>
              </div>
            </div>
            {isContentLoading ? <SkeletonCards /> : busTimings.length === 0 ? (
              <p className="empty-line">No bus schedules have been published yet.</p>
            ) : filteredBusTimings.length === 0 ? (
              <p className="empty-line">No bus schedules match this search.</p>
            ) : (
              <div className="bus-groups">
                {busGroups.map((group, index) => (
                  <section className="bus-group" key={group.routeGroup} aria-labelledby={`bus-group-${index}`}>
                    <h3 id={`bus-group-${index}`}>To {group.routeGroup} side</h3>
                    <div className="bus-list">
                      {group.buses.map((bus) => (
                        <article className="bus-row" key={bus.id || `${bus.route_name}-${bus.departure_time}-${bus.bus_name}`}>
                          <time className="bus-time" dateTime={bus.departure_time}>{formatBusTime(bus.departure_time)}</time>
                          <div className="bus-route">
                            <h4>{bus.bus_name || bus.route_name}</h4>
                            <p>Route: {bus.route_name}</p>
                            <p>Last stop: {bus.last_stop || bus.direction || 'Not specified'}</p>
                            <p>{[bus.operating_days || 'Daily', bus.via].filter(Boolean).join(' · ')}</p>
                          </div>
                          {bus.contact_number && <a className="bus-contact" href={`tel:${String(bus.contact_number).replace(/[^\d+*#,;]/g, '')}`}>Call {bus.contact_number}</a>}
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>

        {events.length > 0 && (
          <section className="events section-pad" id="updates">
            <div className="container">
              <div className="section-heading">
                <div>
                  <h2>Community events</h2>
                  <p>Upcoming events shared by the town.</p>
                </div>
              </div>
              <div className="event-list">
                {filteredEvents.length > 0 ? filteredEvents.map((event) => (
                  <article className="event-row" key={event.id}>
                    <time dateTime={event.starts_at}>{formatDate(event.starts_at, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    <div>
                      <h3>{event.title}</h3>
                      {event.description && <p>{event.description}</p>}
                    </div>
                    {event.venue && <p>{event.venue}</p>}
                  </article>
                )) : <p className="empty-line">No events match this search.</p>}
              </div>
            </div>
          </section>
        )}

        <section className="about section-pad" id="about">
          <div className="container about-layout">
            <div>
              <h2>About Chammanur</h2>
              <p className="about-intro">{about.about_intro}</p>
            </div>
            <dl className="about-facts">
              <div>
                <dt>Location</dt>
                <dd>{about.about_location}</dd>
                <dd>{about.about_location_detail}</dd>
              </div>
              <div>
                <dt>PIN code</dt>
                <dd>{about.about_pin_code}</dd>
                <dd>{about.about_pin_detail}</dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-layout">
          <p>Chammanur public guide.</p>
          <nav aria-label="Footer navigation">
            <a href="#top">Back to top</a>
            <a href="#admin">Administrator access</a>
          </nav>
          <small>{new Date().getFullYear()}</small>
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
    <Suspense fallback={<main className="admin-shell"><div className="admin-auth-card"><p className="admin-muted">Loading Chammanur…</p></div></main>}>
      {isAdminRoute ? <AdminPage /> : <PublicSite />}
    </Suspense>
  );
}
