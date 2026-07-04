# Savor

> Recipe book & health tracker — import recipes from any URL, track daily calories and macros, and monitor weight goals, all from the browser with no sign-up.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)](https://savor-note.vercel.app)
[![PWA Ready](https://img.shields.io/badge/PWA-ready-brightgreen)](#progressive-web-app-pwa-support)

---

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Install](#install)
- [Architecture](#architecture)
- [Design System](#design-system)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [API](#api)
- [Environment Variables](#environment-variables)
- [PWA Support](#progressive-web-app-pwa-support)
- [License](#license)

---

## Features

| Feature | Description |
|---------|------------|
| Recipe Import | Paste any recipe URL — ingredients, instructions, and nutrition are extracted automatically via a Vercel serverless function |
| Manual Creation | Build recipes from scratch with custom ingredients, step-by-step instructions, and full nutrition data |
| Recipe Library | Browse, search, favorite, and filter recipes by meal type (breakfast, lunch, dinner, snacks) |
| Cooking Conversions | Built-in measurement converters — volume (cups, tbsp, tsp, ml, liters), weight (lbs, oz, g, kg), temperature (F ↔ C), and oven-to-air-fryer (temp/time adjustments) — with fraction input support ("1 1/2") and a quick-reference cheat sheet |
| Calorie Ring | Animated SVG calorie tracker on the dashboard — fill the ring throughout the day with color-coded macro breakdown |
| Meal Logging | Log recipes or individual foods to your daily diary with per-meal grouping and visual macro bars |
| Nutrition Goals | Set custom daily targets for calories, protein, carbs, and fat — progress bars update in real time |
| Food Search | Search across Open Food Facts, USDA FoodData Central, and Spoonacular — proxied through a Vercel serverless function to keep API keys secure |
| Health Dashboard | Weight logging with Chart.js trend visualization, BMI calculation, and TDEE estimation based on your profile |
| Data Management | Export all data as a JSON backup (timestamped download), import a previously exported backup to restore, or reset all data with a confirmation dialog — all from the Health page |
| Light / Dark Theme | System-aware `prefers-color-scheme` with floating manual toggle (sun/moon), persisted to `localStorage` |
| Notebook Aesthetic | Ruled paper background with red margin line, paper grain texture, and warm gradient washes — like a Moleskine journal |
| Custom Dialogs | Bottom-sheet modals with drag handle, keyboard support (Escape to close), and focus restoration |
| Toast Notifications | Rounded-rectangular toasts with success/error/warning color coding and auto-dismiss |
| Frosted Glass UI | `backdrop-filter: blur()` glassmorphism on cards, inputs, navigation, and the floating bottom bar |
| Local Storage | All recipes, meal logs, weight entries, and profile data persisted in `localStorage` — no account, no server, no sign-up |
| Responsive PWA | Mobile-first with a floating bottom nav bar; converts to a 240px sidebar on desktop (768px+) |
| Accessibility | WCAG 2.1 AA: `for` attributes on all form labels, `aria-hidden` on decorative SVGs, `role="tabpanel"` with `aria-labelledby`, `role="progressbar"` with `aria-valuenow/min/max` on macro bars, `aria-live` announcements on navigation, converter results, and toasts, focus trapping in dialogs, keyboard-accessible food search with Escape/close, visible `:focus-visible` indicators on inputs, nav items, and interactive controls, chart canvas with `role="img"` + `aria-label`, programmatic label-input associations, skip-to-main-content link |
| No Framework | Vanilla HTML, CSS, and JavaScript; CSS `@layer` organization |

---

## Demo

To run locally with all features:

```bash
git clone https://github.com/rhythmd22/Savor.git
cd Savor
cp .env.example .env    # add API keys (optional)
npx vercel dev
```

For a quick preview without API features, serve statically:

```bash
python3 -m http.server 8080
```

Open `http://localhost:3000/` (vercel dev) or `http://localhost:8080/` in your browser.

---

## Install

```bash
git clone https://github.com/rhythmd22/Savor.git
cd Savor
```

Then serve the directory with any static web server:

```bash
python3 -m http.server
```

Open `http://localhost:8000/` in your browser.

---

## Architecture

```
Savor/
├── index.html                  # SPA shell with 6 <template> elements
├── css/
│   ├── styles.css              # Design tokens, reset, layout, components, theme overrides
│   ├── index.css               # Dashboard page (calorie ring, macros, meal entries)
│   ├── recipes.css             # Recipe list, search, filter chips, card grid
│   ├── recipe-detail.css       # Recipe detail (hero, nutrition grid, ingredients, instructions)
│   ├── import.css              # Recipe import (URL/manual/API tabs, form, spinner)
│   ├── meal-log.css            # Daily food diary (date selector, summary bars, search, entries)
│   ├── health.css              # Health tracking (metrics, weight log, chart, profile form)
│   └── conversions.css         # Cooking conversions (grid, cards, inputs, results)
├── js/
│   ├── app.js                  # SPA router, navigation, page initialization
│   ├── theme.js                # Light/dark theme persistence and toggle
│   ├── data.js                 # localStorage CRUD (recipes, meal logs, weight entries, profile) + export/import/reset
│   ├── utils.js                # Shared utilities: toast, dialog, debounce, formatting, escapeHTML
│   ├── api.js                  # Client-side API: recipe extraction, food search (via serverless proxy)
│   ├── recipe-parsers.js       # Shared recipe parsers (used by both client and serverless function)
│   ├── index.js                # Dashboard: calorie ring, macro breakdown, recent recipes, meal log summary
│   ├── recipes.js              # Recipe list: search, filter, sort, favorites
│   ├── recipe-detail.js        # Recipe detail: nutrition, ingredients, instructions, log/delete actions
│   ├── import.js               # Import page: URL extraction, manual create, API source status, cooking conversions tab
│   ├── meal-log.js             # Food diary: date navigation, food search, meal entries, macro bars
│   ├── health.js               # Health page: weight chart (Chart.js), profile, TDEE, data export/import/reset
│   └── conversions.js          # Cooking unit converters (volume, weight, temperature, oven → air fryer)
├── api/
│   ├── recipe-extractor.js     # Vercel serverless — extracts recipe data from URLs
│   ├── food-search.js          # Vercel serverless — proxies USDA, Spoonacular, Open Food Facts searches
│   └── food-search-status.js   # Vercel serverless — reports which API sources are configured
├── icon.svg                    # Vector PWA icon (source — used as favicon and apple-touch-icon)
├── icon-maskable.svg                       # Maskable icon variant with safe-zone padding
├── android-chrome-192x192.png              # PWA icon 192x192
├── android-chrome-512x512.png              # PWA icon 512x512
├── android-chrome-maskable-192x192.png     # Android adaptive icon 192x192
├── android-chrome-maskable-512x512.png     # Android adaptive icon 512x512
├── apple-touch-icon.png                    # iOS home screen 180x180
├── apple-touch-icon-120x120.png            # iOS home screen 120x120
├── apple-touch-icon-152x152.png            # iOS home screen 152x152
├── apple-touch-icon-167x167.png            # iOS home screen 167x167
├── favicon.ico                             # Multi-resolution favicon (16+32+48)
├── manifest.json               # PWA Web App Manifest
├── service-worker.js           # Offline caching and install flow
├── vercel.json                 # Vercel deployment config (SPA rewrites + serverless function)
├── build-bundle.sh             # Shell script to regenerate bundle.js from source modules
├── package.json                # npm scripts: build, lint, test
├── package-lock.json
├── eslint.config.js            # ESLint flat config
├── tests/
│   ├── recipe-parsers.test.js  # Tests for shared recipe parsers
│   └── data.test.js            # Tests for data layer (localStorage CRUD)
├── .gitignore
├── .env.example                # Environment variable template
├── LICENSE
```

The app is a single-page application. All views live as `<template>` elements inside `index.html`. The router in `app.js` clones templates into `#app-root` on navigation. Data flows through `localStorage` via `data.js` and is consumed by page-specific init functions. `bundle.js` is a simple concatenation of all ES modules generated by `build-bundle.sh` during the `npm run build` step.

**Design decisions:**
- `<template>`-based SPA instead of multi-page HTML (keeps navigation instant)
- Inline SVG icons instead of icon libraries (zero external dependencies)
- `localStorage` for persistence (works offline, no server, no privacy concerns)
- `backdrop-filter` glassmorphism on all containers (modern iOS/Android feel)
- CSS `@layer` organization (tokens → reset → layout → components)
- `bundle.js` is a simple concatenation of all ES modules — generated by `npm run build` via `build-bundle.sh`
- `.glass` and `.glass-card` reusable CSS classes (consistent frosted effect everywhere)
- Notebook paper aesthetic: ruled lines, red margin, paper grain — thematically appropriate for recipes and journaling
- Floating bottom nav on mobile, sidebar on desktop — distinct from EcoFlow's edge-to-edge approach
- Bottom-sheet dialogs instead of center modals — more natural on mobile
- Focus trapping and Escape-key dismissal on all dialogs — keyboard-only navigation works end-to-end
- Full WCAG 2.1 AA compliance — labels, roles, live regions, focus indicators, and chart accessibility

---

## Design System

Savor uses a warm orange-tinted theme with frosted glass surfaces, notebook paper aesthetics, and a full light theme:

### Dark Theme (Default)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-body` | `#1C1714` | Page background |
| `--bg-elevated` | `#241E1A` | Card backgrounds |
| `--glass-bg` | `rgba(36, 30, 26, 0.55)` | Frosted card surfaces |
| `--glass-blur` | `22px` | Backdrop blur radius |
| `--brand-600` | `#D35A1C` | Primary UI elements, active nav, ring fill |
| `--brand-700` | `#B8450D` | Primary buttons, FAB |
| `--brand-text` | `#FFA970` | Links, brand-colored text (WCAG AA 4.5:1+) |
| `--text-primary` | `#F2EBE5` | Headings, body text |
| `--text-secondary` | `#B1A598` | Secondary text |
| `--text-tertiary` | `#BAB2A8` | Captions, hints, labels |
| `--text-muted` | `#C3BCB2` | Disabled text, placeholder hints |

### Light Theme (`[data-theme="light"]`)

| Token | Value | Contrast | Usage |
|-------|-------|----------|-------|
| `--bg-body` | `#FFFBF8` | — | Page background (warm cream) |
| `--bg-elevated` | `#FFF6F0` | — | Card backgrounds |
| `--glass-bg` | `rgba(255, 255, 255, 0.70)` | — | Frosted card surfaces |
| `--brand-text` | `#D35A1C` | 6.1:1 | Links, brand-colored text |
| `--text-primary` | `#1A1512` | 15.2:1 | Headings, body text |
| `--text-secondary` | `#5C4E42` | 7.2:1 | Secondary text |
| `--text-tertiary` | `#665B51` | 5.8:1 | Captions, hints |
| `--text-muted` | `#5C5249` | 6.8:1 | Disabled text, placeholder hints |

All text tokens meet WCAG 2.1 AA minimum (4.5:1 for normal text).

### Notebook Paper Background

Instead of floating gradient orbs, Savor uses a layered paper aesthetic:

| Layer | Purpose |
|-------|---------|
| `.bg-paper-wash` | Warm radial gradients — ambient light on paper |
| `.bg-ruled` | Repeating horizontal lines at 28px spacing — notebook ruling |
| `.bg-margin` | Vertical red line at 37px from left — notebook margin |
| `.bg-noise` | SVG noise texture — paper grain |

### Nutritional Semantic Colors

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--macro-protein` | `#93C5FD` | `#2563EB` | Protein bars, tags |
| `--macro-carbs` | `#FCD34D` | `#D97706` | Carb bars, tags |
| `--macro-fat` | `#FCA5A5` | `#DC2626` | Fat bars, tags |
| `--calorie-under` | `#22C55E` | `#16A34A` | Under calorie target |
| `--calorie-over` | `#FCA5A5` | `#DC2626` | Over calorie target |
| `--calorie-target` | `#FCD34D` | `#D97706` | Near calorie target |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | Inter, system font stack | Body text, UI |
| `--font-display` | Playfair Display, Georgia | Headings, large numbers, calorie ring |
| Type scale | 0.6875rem – 2.75rem | Slightly larger than EcoFlow for a more luxurious recipe-book feel (1rem body text, 1.6 line-height) |

### Glass Component

All cards, inputs, and navigation share a consistent frosted glass pattern:

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(22px) saturate(1.2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
}
```

Glass cards also include a subtle paper grain texture via a `::after` pseudo-element with an SVG noise pattern. Buttons use `border-radius: var(--radius-md)` (rounded rectangles) instead of pills, and toasts are rectangular — distinct from EcoFlow's pill-shaped components.

### Theme Toggle

A fixed floating button in the top-right corner switches between themes. Persists to `localStorage`. Falls back to `prefers-color-scheme` on first visit. Live-listens for OS theme changes. PWA `theme-color` meta tag updates dynamically.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core | HTML5, CSS3, JavaScript (ES6+ modules) |
| Storage | `localStorage` |
| Charts | [Chart.js 4.5.1](https://www.chartjs.org/) (CDN) — weight trend visualization |
| Recipe Extraction | Vercel serverless function (Node.js) — extracts structured data from recipe URLs |
| Food Search | [Open Food Facts](https://world.openfoodfacts.org/), [USDA FoodData Central](https://fdc.nal.usda.gov/), [Spoonacular](https://spoonacular.com/food-api) |
| Iconography | [Lucide](https://lucide.dev) — inline SVG icons (MIT licensed) |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter), [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (Google Fonts) |
| Hosting | Vercel (or any static host for client-only use) |
| PWA | Service Worker API, Web App Manifest |

No framework. All visual effects (glassmorphism, notebook paper texture, calorie ring, progress bars, chart-like bars) are pure CSS. `bundle.js` is a simple concatenation of all JS modules for the production build.

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)

### Local Setup

1. Clone the repository
2. Start a local server from the project directory:
   ```bash
   python3 -m http.server
   ```
3. Open `http://localhost:8000/` in your browser

No dependencies to install, no environment variables to configure. The app works fully offline using `localStorage` for all data.

### Recipe URL Extraction and Food Search (Optional)

To enable recipe extraction from URLs and food search with USDA/Spoonacular:

```bash
cp .env.example .env      # add API keys (optional)
npx vercel dev
```

This starts the Vercel development environment with all serverless functions. Set `USDA_API_KEY` and/or `SPOONACULAR_API_KEY` in `.env` (both are optional — Open Food Facts always works). Without `vercel dev`, you can still create recipes manually and search local recipes.

---

## Scripts

| Command | Description |
|---------|------------|
| `npm install` | Install dev dependencies (ESLint for linting) |
| `npm run build` | Regenerate `js/bundle.js` from source modules |
| `npm run lint` | Run ESLint on all JS source files |
| `npm run test` | Run the test suite |
| `npx vercel dev` | Start local dev server with all API functions |
| `python3 -m http.server 8080` | Quick static preview (no API features) |

Dependencies are only needed for dev tooling (linting, testing). The app itself is vanilla HTML, CSS, and JavaScript.

---

## API

All third-party API calls are proxied through Vercel serverless functions. API keys are injected server-side and never exposed to the browser.

### Recipe Extractor

```
POST /api/recipe-extractor
Content-Type: application/json

{ "url": "https://example.com/recipe" }
```

Fetches a recipe URL server-side and extracts structured data (title, ingredients, instructions, nutrition, image, cook time, servings) from JSON-LD, HTML Microdata, or generic page parsing. No API key required.

### Food Search

```
POST /api/food-search
Content-Type: application/json

{ "query": "chicken breast" }
```

Proxies searches to Open Food Facts, USDA FoodData Central, and Spoonacular in parallel. Returns combined results from all enabled sources:

```json
{
  "results": [ { "id": "usda-...", "name": "...", "calories": 165, ... } ],
  "sources": { "usda": true, "spoonacular": true, "openFoodFacts": true }
}
```

### Food Search Status

```
GET /api/food-search-status
```

Returns which API sources are configured:

```json
{ "usda": true, "spoonacular": false, "openFoodFacts": true }
```

Used by the Import → API tab to display source status.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|------------|
| `USDA_API_KEY` | No | USDA FoodData Central key from [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup) |
| `SPOONACULAR_API_KEY` | No | Spoonacular key from [spoonacular.com/food-api/console](https://spoonacular.com/food-api/console) |

Copy `.env.example` to `.env` for local development. Set these in Vercel's project dashboard for production.

---

## Progressive Web App (PWA) Support

Savor can be installed on mobile devices:

1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the Share button and select **Add to Home Screen** (iOS) or the install prompt (Android)
3. The app launches in standalone full-screen mode with offline support

The service worker caches all assets and CDN dependencies with a cache-first strategy. API calls are excluded from caching.

---

## License

MIT © [Rhythm Desai](LICENSE)