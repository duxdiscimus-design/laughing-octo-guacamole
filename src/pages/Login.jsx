import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setSession } = useAppState();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'discimus' && password === 'Dux!') {
      setSession({
        token: 'hft_auth_token',
        username,
        timestamp: Date.now(),
      });
      navigate('/schedule');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#0f0f11' }}
    >
      {/* Branding */}
      <div className="mb-8 text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ backgroundColor: '#f5c842' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0f0f11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#f5c842' }}>
          Harbor Freight Tools
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
          Store Scheduler — Manager Portal
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ backgroundColor: '#1a1a1f', border: '1px solid #2a2a32' }}
      >
        <h2 className="text-xl font-semibold mb-6" style={{ color: '#e8e8ee' }}>
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-1.5"
              style={{ color: '#e8e8ee' }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              required
              className="w-full rounded-lg px-3 text-sm outline-none transition-colors"
              style={{
                height: '44px',
                backgroundColor: '#0f0f11',
                border: '1px solid #2a2a32',
                color: '#e8e8ee',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#f5c842'; }}
              onBlur={(e) => { e.target.style.borderColor = '#2a2a32'; }}
              placeholder="Enter username"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: '#e8e8ee' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
              className="w-full rounded-lg px-3 text-sm outline-none transition-colors"
              style={{
                height: '44px',
                backgroundColor: '#0f0f11',
                border: '1px solid #2a2a32',
                color: '#e8e8ee',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#f5c842'; }}
              onBlur={(e) => { e.target.style.borderColor = '#2a2a32'; }}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div
              className="mb-4 px-3 py-2.5 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
            style={{
              height: '44px',
              backgroundColor: '#f5c842',
              color: '#0f0f11',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Sign In
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: '#6b7280' }}>
        © {new Date().getFullYear()} Harbor Freight Tools. All rights reserved.
      </p>
    </div>
  );
}
