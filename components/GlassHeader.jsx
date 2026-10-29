import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const navigation = [
  ['The journey', '#journey'],
  ['Directory', '#directory'],
  ['Bus timings', '#bus-timings'],
  ['Stories', '#stories'],
  ['Contribute', '#contact'],
];

export default function GlassHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

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
      <AnimatePresence>
        {menuOpen && (
          <motion.button
            className="mobile-nav-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="glass-header">
        <div className="glass-header-inner">
          <a className="brand" href="#top" onClick={closeMenu} aria-label="Chammanur home">
            CHAMMAN<span>U</span>R<span>.</span>
          </a>

          <nav className="navlinks" aria-label="Main navigation">
            {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
          </nav>

          <a className="header-cta" href="#journey">Explore town <span aria-hidden="true">↗</span></a>

          <motion.button
            className="menu"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
            whileTap={{ scale: 0.94 }}
          >
            <span className={`menu-icon ${menuOpen ? 'is-open' : ''}`} aria-hidden="true">
              <span />
              <span />
            </span>
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.nav
                className="mobile-nav"
                id="mobile-navigation"
                aria-label="Mobile navigation"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {navigation.map(([label, href], index) => (
                  <a key={href} href={href} onClick={closeMenu}>
                    <span>{label}</span>
                    <small>{String(index + 1).padStart(2, '0')}</small>
                  </a>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
