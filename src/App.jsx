import React from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AppStateProvider, useAppState, DEFAULT_EMPLOYEES } from './hooks/useAppState.jsx';

import Login from './pages/Login';
import Schedule from './pages/Schedule';
import Staff from './pages/Staff';
import Rules from './pages/Rules';
import Labor from './pages/Labor';
import Tasks from './pages/Tasks';
import Requests from './pages/Requests';
import Export from './pages/Export';
import Settings from './pages/Settings';

export { DEFAULT_EMPLOYEES };

const NAV_ITEMS = [
  { path: '/schedule', label: 'Schedule' },
  { path: '/staff', label: 'Staff' },
  { path: '/rules', label: 'Rules' },
  { path: '/labor', label: 'Labor' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/requests', label: 'Requests' },
  { path: '/export', label: 'Export' },
  { path: '/settings', label: 'Settings' },
];

function RequireAuth({ children }) {
  const { session } = useAppState();
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppLayout() {
  const { session } = useAppState();

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar — desktop */}
      <aside
        className="hidden md:flex flex-col w-52 shrink-0 border-r"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>HFT Scheduler</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-accent'
                    : 'hover:text-text-primary'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                backgroundColor: isActive ? 'rgba(245,200,66,0.08)' : 'transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/login" element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule" element={<RequireAuth><Schedule /></RequireAuth>} />
            <Route path="/staff" element={<RequireAuth><Staff /></RequireAuth>} />
            <Route path="/rules" element={<RequireAuth><Rules /></RequireAuth>} />
            <Route path="/labor" element={<RequireAuth><Labor /></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
            <Route path="/requests" element={<RequireAuth><Requests /></RequireAuth>} />
            <Route path="/export" element={<RequireAuth><Export /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/schedule" replace />} />
          </Routes>
        </main>

        {/* Bottom tab bar — mobile */}
        <nav
          className="md:hidden flex border-t"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {NAV_ITEMS.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center py-2 text-xs"
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <AppLayout />
      </HashRouter>
    </AppStateProvider>
  );
}
