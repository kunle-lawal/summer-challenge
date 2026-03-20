# Summer Challenge

Vite + React + TypeScript app for the workout challenge (Google Sheets / Apps Script backend).

## Setup

- **Node.js 18+** (recommended: **20** — see `.nvmrc` and `netlify.toml`). If `npm run dev` fails with **`SyntaxError: Unexpected reserved word`** inside `vite.js`, your Node is too old; upgrade or run `nvm use` (or install Node 20 from [nodejs.org](https://nodejs.org/)).
- Copy `.env.example` to `.env` and set **`VITE_SCRIPT_URL`** to your Apps Script web app URL.
- Optional: override **`VITE_CHALLENGE_START`**, **`VITE_PEOPLE`** (JSON array), or goal-reset window dates.

```bash
npm install
npm run dev
```

## Build / Netlify

Production build outputs to **`dist/`**. Netlify is configured with `publish = "dist"`, SPA `redirects` to `index.html`, and **`NODE_VERSION = "20"`** so the build uses a current Node runtime.

```bash
npm run build
```

## Maintainer reference

For architecture, file locations, context API, and conventions for future changes, see **[`docs/APP_REFERENCE.md`](./docs/APP_REFERENCE.md)**. AI assistants working in this repo are guided to consult that doc and keep it updated when behavior changes (see `.cursor/rules/app-reference.mdc`).

## Legacy reference

The previous single-file app is preserved in [`LEGACY_INDEX_REFERENCE.md`](./LEGACY_INDEX_REFERENCE.md) for reference only.
