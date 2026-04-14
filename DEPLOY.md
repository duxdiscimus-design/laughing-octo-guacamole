# Deployment Guide

## Vercel

1. Push the repository to GitHub.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects Vite. Leave defaults; click **Deploy**.
4. The `vercel.json` rewrite rule handles SPA routing.

## Netlify

1. Push the repository to GitHub.
2. Import the repository at [app.netlify.com](https://app.netlify.com).
3. Set **Build command**: `npm run build`
4. Set **Publish directory**: `dist`
5. Create a `public/_redirects` file with: `/* /index.html 200`
6. Click **Deploy**.

## GitHub Pages

1. Install `gh-pages`: `npm install --save-dev gh-pages`
2. Add to `package.json` scripts:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```
3. In `vite.config.js`, set `base` to your repo name, e.g., `base: '/laughing-octo-guacamole/'`.
4. Run: `npm run deploy`
5. Enable GitHub Pages in repository **Settings → Pages**, source: `gh-pages` branch.

> Note: HashRouter is used so all routes resolve correctly on static hosts without server-side rewrite support.
