import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { navigate } from '../hooks';

const navItems: Array<{ key: string; label: string; icon: IconName; tag: string }> = [
  { key: '', label: 'Dashboard', icon: 'dashboard', tag: '' },
  { key: 'products', label: 'Products', icon: 'products', tag: 'MySQL + cache' },
  { key: 'customers', label: 'Customers', icon: 'customers', tag: 'MySQL' },
  { key: 'orders', label: 'Orders', icon: 'orders', tag: 'MySQL' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications', tag: 'SSE' },
  { key: 'notes', label: 'Notes', icon: 'notes', tag: 'Redis' },
  { key: 'redis', label: 'Redis tools', icon: 'redis', tag: 'Redis' },
];

export function Sidebar({ route }: { route: string }) {
  const isActive = (key: string) => (key === '' ? route === '' : route === key || route.startsWith(`${key}/`));

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => navigate('')} role="button" tabIndex={0}>
        <span className="brand-mark">
          <Icon name="bolt" size={20} />
        </span>
        <span>
          <strong>CRUD Console</strong>
          <small>Spring Boot · MySQL · Redis</small>
        </span>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.key || 'dashboard'}
            type="button"
            className={`nav-item ${isActive(item.key) ? 'active' : ''}`}
            onClick={() => navigate(item.key)}
          >
            <Icon name={item.icon} size={18} />
            <span className="nav-label">{item.label}</span>
            {item.tag && <span className="nav-tag">{item.tag}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot" />
        <div>
          <strong>API base</strong>
          <code>/api/v1</code>
        </div>
      </div>
    </aside>
  );
}

export function Layout({ route, children }: { route: string; children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} />
      <main className="content">{children}</main>
    </div>
  );
}
