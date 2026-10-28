import { useMemo, useState } from 'react';
import TownMap from './components/TownMap';

const stops = ['sbi', 'school', 'post'];
const stopMeta = {
  sbi: { label: 'State Bank of India', tagline: 'Punnayurkulam branch · Your first landmark on the road into town.' },
  school: { label: 'Amal English School', tagline: 'Where the next generation of chammanur begins their day.' },
  post: { label: 'Punnayurkulam Post Office', tagline: 'PIN 679561 · A small place that connects us to everywhere.' },
};

const directoryData = [
  ['Banks', 'State Bank of India', 'Punnayurkulam branch · Althara'],
  ['Schools', 'Amal English School', 'chammanur · Via Punnayurkulam'],
  ['Services', 'chammanur Post Office', 'PIN 679561 · Local services'],
  ['Banks', 'South Indian Bank', 'Punnayurkulam branch'],
  ['Health', 'Medical Shop', 'Add your trusted local listing'],
  ['Transport', 'Auto / Taxi Stand', 'Add contact and stand location'],
];

export default function App() {
  const [activeStop, setActiveStop] = useState('sbi');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => ['All', ...new Set(directoryData.map(([group]) => group))], []);

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    return directoryData.filter(([group, title, description]) => {
      const matchesCategory = category === 'All' || group === category;
      const matchesQuery = !term || `${group} ${title} ${description}`.toLowerCase().includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const moveToNextStop = () => {
    const currentIndex = stops.indexOf(activeStop);
    const nextStop = stops[(currentIndex + 1) % stops.length];
    setActiveStop(nextStop);
  };

  return (
    <>
      <header className="hero" id="top">
        <div className="container">
          <div className="nav">
            <a className="brand" href="#top">
              CHAMMAN<span>U</span>R<span>.</span>
            </a>

            <nav className="navlinks" aria-label="Main navigation">
              <a href="#journey">The journey</a>
              <a href="#directory">Directory</a>
              <a href="#stories">Stories</a>
              <a href="#contact">Contribute</a>
            </nav>

            <button className="menu" type="button" aria-label="Open menu">
              ☰
            </button>
          </div>

          <div className="hero-content">
            <div className="eyebrow">A living map of Kerala · 10°40′N 76°02′E</div>
            <h1>
              Find your way
              <br />
              back home.
            </h1>
            <p className="hero-copy">
              A new way to experience chammanur — its green roads, familiar landmarks and the people who
              make this place feel like home.
            </p>
            <a className="primary" href="#journey">
              Start the journey
            </a>
          </div>
        </div>
        <div className="scroll-cue">Scroll to explore</div>
      </header>

      <main>
        <section className="explore" id="journey">
          <div className="container">
            <div className="explore-head">
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
            </div>

            <div className="map-stage" id="map">
              <div className="map-ui">
                <div className="map-status">
                  <i className="live"></i>
                  Live route · 3 landmarks
                </div>
              </div>

              <TownMap activeStop={activeStop} onSelectStop={setActiveStop} />

              <div className="map-footer">
                <p>
                  Currently exploring: <strong>{stopMeta[activeStop].label}</strong>
                </p>
                <button type="button" onClick={moveToNextStop}>
                  Next stop&nbsp; →
                </button>
              </div>
            </div>

            <div className="waypoints" id="waypointList">
              {stops.map((key, index) => (
                <article
                  key={key}
                  className="waypoint"
                  data-card={key}
                  style={{ opacity: activeStop === key ? 1 : 0.48 }}
                  onClick={() => setActiveStop(key)}
                >
                  <div className="waypoint-number">
                    {String(index + 1).padStart(2, '0')} — {index === 0 ? 'FIRST STOP' : index === 1 ? 'THE HEART' : 'KEEP IN TOUCH'}
                  </div>
                  <div>
                    <h3>{stopMeta[key].label}</h3>
                    <p>{stopMeta[key].tagline}</p>
                  </div>
                  <button className="waypoint-action" type="button" aria-label={`Show ${stopMeta[key].label} on map`}>
                    ↗
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="directory" id="directory">
          <div className="container">
            <div className="directory-header">
              <div>
                <div className="kicker">02 / Find your people</div>
                <h2 className="title">
                  The local
                  <br />
                  <em>directory.</em>
                </h2>
              </div>
              <p>Useful places, familiar faces and everything you need — all in one place.</p>
            </div>

            <input
              className="search"
              type="search"
              placeholder="Search the directory…"
              aria-label="Search the directory"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <div className="filters">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`filter ${category === item ? 'active' : ''}`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="directory-grid">
              {filteredData.length > 0 ? (
                filteredData.map(([group, title, description]) => (
                  <article key={`${group}-${title}`} className="directory-card">
                    <div className="kicker">{group}</div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <small>Explore listing&nbsp; ↗</small>
                  </article>
                ))
              ) : (
                <p className="no-results">No listings found. Try another search.</p>
              )}
            </div>
          </div>
        </section>

        <section id="stories" className="stories">
          <div className="container">
            <div className="kicker">03 / A place with stories</div>
            <h2 className="title title-story">
              Every road has
              <br />
              <em>a memory.</em>
            </h2>
          </div>
        </section>
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
