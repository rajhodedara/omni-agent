'use client';

import { useUIStore } from '../../stores/ui-store';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore();

  return (
    <button 
      onClick={toggleTheme}
      className="flex-center"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        fontSize: '1.25rem',
        transition: 'all 0.3s ease',
      }}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <div style={{ transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.5s ease' }}>
        {theme === 'dark' ? '🌙' : '☀️'}
      </div>
    </button>
  );
}
