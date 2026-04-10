import React from 'react';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-accent)' }}>HFT Scheduler</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Harbor Freight Tools — Store Scheduler</p>
        <p className="text-center" style={{ color: 'var(--color-text-muted)' }}>Login Placeholder</p>
      </div>
    </div>
  );
}
