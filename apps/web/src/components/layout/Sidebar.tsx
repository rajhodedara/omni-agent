'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '../../stores/ui-store';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '💬' },
  { name: 'Executions', path: '/executions', icon: '⚡' },
  { name: 'Memory', path: '/memory', icon: '🧠' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside style={{
      width: sidebarOpen ? '240px' : '64px',
      transition: 'width 0.3s ease',
      borderRight: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: sidebarOpen ? 'space-between' : 'center', alignItems: 'center' }}>
        {sidebarOpen && <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Menu</span>}
        <button onClick={toggleSidebar} style={{ color: 'var(--text-secondary)', padding: 'var(--space-1)' }}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav style={{ padding: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link 
              key={item.path} 
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isActive ? 'var(--bg-glass)' : 'transparent',
                color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
              }}
              title={!sidebarOpen ? item.name : undefined}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
