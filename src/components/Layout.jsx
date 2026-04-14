import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Calendar, Users, BookOpen, DollarSign, CheckSquare,
  Inbox, Download, Settings, LogOut, Menu, X,
} from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { LS_KEYS } from '../constants';

const NAV_ITEMS = [
  { path: '/schedule',  label: 'Schedule',  Icon: Calendar     },
  { path: '/staff',     label: 'Staff',     Icon: Users        },
  { path: '/rules',     label: 'Rules',     Icon: BookOpen     },
  { path: '/labor',     label: 'Labor',     Icon: DollarSign   },
  { path: '/tasks',     label: 'Tasks',     Icon: CheckSquare  },
  { path: '/requests',  label: 'Requests',  Icon: Inbox        },
  { path: '/export',    label: 'Export',    Icon: Download     },
  { path: '/settings',  label: 'Settings',  Icon: Settings     },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setSession, rules, rotationStart, schedule } = useAppState();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(LS_KEYS.SESSION);
    setSession(null);
    navigate('/login', { replace: true });
  };

  /* Footer data */
  const activeRules = Array.isArray(rules) ? rules.filter((r) => r.isOn === true).length : 0;

  const currentWeek = (() => {
    if (!rotationStart) return 1;
    const start = new Date(rotationStart);
    const now = new Date();
    const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(4, (diff % 4) + 1));
  })();

  // TODO: calculate real violations once schedule-validation logic is implemented
  const violations = 0;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ── Sidebar (desktop ≥768px) ── */}
      <aside
        className="hidden md:flex flex-col w-52 shrink-0 border-r"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-base font-bold leading-tight" style={{ color: 'var(--color-accent)' }}>
            HFT Scheduler
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors"
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                backgroundColor: isActive ? 'rgba(245,200,66,0.08)' : 'transparent',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)', minHeight: '44px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center justify-between px-4 py-2 border-b shrink-0"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', minHeight: '52px' }}
        >
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--color-text-muted)', minHeight: '44px', minWidth: '44px' }}
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <span
            className="hidden md:block text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Harbor Freight Tools
          </span>
          <span
            className="md:hidden text-sm font-semibold"
            style={{ color: 'var(--color-accent)' }}
          >
            HFT Scheduler
          </span>

          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)', minHeight: '44px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-b z-50"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {NAV_ITEMS.map(({ path, label, Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  backgroundColor: isActive ? 'rgba(245,200,66,0.08)' : 'transparent',
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer
          className="shrink-0 flex items-center justify-center gap-4 px-4 py-2 text-xs border-t"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', minHeight: '36px' }}
        >
          <span>Week {currentWeek} of 4</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span>{activeRules} rules active</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ color: violations === 0 ? '#22c55e' : '#ef4444' }}>
            {violations === 0 ? '✅ All clear' : `${violations} violations`}
          </span>
        </footer>

        {/* Bottom tab bar (mobile <768px) */}
        <nav
          className="md:hidden flex border-t shrink-0"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {NAV_ITEMS.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                minHeight: '52px',
              })}
            >
              <Icon size={18} />
              <span className="text-[10px] leading-none">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
