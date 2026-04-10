/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f11',
        surface: '#1a1a1f',
        accent: '#f5c842',
        'text-primary': '#e8e8ee',
        'text-muted': '#6b7280',
        border: '#2a2a32',
        task: {
          LOD: '#f5c842',
          Cashier: '#3b82f6',
          Planning: '#8b5cf6',
          ConfCall: '#14b8a6',
          Floor: '#22c55e',
          Open: '#f97316',
          Close: '#ef4444',
          Lunch: '#6b7280',
          CashOffice: '#ec4899',
          Custom: '#6366f1',
          ApprovedOff: '#2a2a32',
        },
      },
    },
  },
  plugins: [],
};
