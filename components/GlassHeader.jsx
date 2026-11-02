import { useEffect, useState } from 'react';

export default function GlassHeader({ hasPeople, hasUpdates, hasNotices }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = [
    ['Directory', '#directory'],
    ['Landmarks', '#places'],
    ...(hasPeople ? [['People', '#people']] : []),
    ['Transport', '#bus-timings'],
    ...(hasNotices ? [['Notices', '#notices']] : []),
    ...(hasUpdates ? [['Events', '#updates']] : []),
    ['About', '#about'],
  ];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {menuOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={closeMenu}
        />
      )}
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#top" onClick={closeMenu}>Chammanur</a>
          <nav className="navlinks" aria-label="Main navigation">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>
          <a className="header-cta" href="#directory">Find information</a>
          <button
            className="menu"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            <span className={`menu-icon${menuOpen ? ' is-open' : ''}`} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
          <nav
            className="mobile-nav"
            id="mobile-navigation"
            aria-label="Mobile navigation"
            hidden={!menuOpen}
          >
            {navigation.map(([label, href]) => (
              <a key={href} href={href} onClick={closeMenu}>{label}</a>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
