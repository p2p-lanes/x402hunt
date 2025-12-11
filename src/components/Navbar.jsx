import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar" style={{
      width: '90%',
      maxWidth: '800px',
      margin: '1rem auto 2rem auto', // Added bottom margin to push content down
      border: '3px solid black',
      boxShadow: '8px 8px 0px 0px #000000',
      backgroundColor: 'var(--bg-secondary)',
      position: 'sticky',
      top: '1rem',
      zIndex: 50,
      pointerEvents: 'auto' // Re-enable clicks since parent track disables them
    }}>
      <div className="container navbar-content" style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link to="/" className="logo" style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          letterSpacing: '-0.025em',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-serif)'
        }}>
          <span className="text-accent">x402</span> Hunt
        </Link>

        <div className="nav-links" style={{ display: 'flex', gap: '1.5rem' }}>
          <Link to="/run-ads" className="nav-link" style={{
            fontSize: '0.9rem',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Terminal size={14} /> Run Ads
          </Link>
        </div>
      </div>
    </nav>
  );
}
