'use client';

import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="glass" style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-3) var(--space-6)',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{ fontSize: '1.5rem' }}>✨</div>
          <span className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Omni Agent</span>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <nav style={{ display: 'flex', gap: 'var(--space-4)', marginRight: 'var(--space-4)' }}>
          <Link href="/dashboard" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }}>Dashboard</Link>
          <Link href="#" style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.2s' }}>Help</Link>
        </nav>
        
        <ThemeToggle />
        
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: 'pointer'
        }}>
          {user?.name?.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
}
