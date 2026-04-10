import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStateProvider, DEFAULT_EMPLOYEES } from './hooks/useAppState.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import Layout from './components/Layout.jsx';

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

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule"  element={<Schedule />} />
            <Route path="/staff"     element={<Staff />} />
            <Route path="/rules"     element={<Rules />} />
            <Route path="/labor"     element={<Labor />} />
            <Route path="/tasks"     element={<Tasks />} />
            <Route path="/requests"  element={<Requests />} />
            <Route path="/export"    element={<Export />} />
            <Route path="/settings"  element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </HashRouter>
    </AppStateProvider>
  );
}
