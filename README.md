# Savor

> Recipe book & health tracker — import recipes from any URL, track daily calories and macros, and monitor weight goals, all from the browser with no sign-up and no server.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
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
- [API Integrations](#api-integrations)
- [PWA Support](#progressive-web-app-pwa-support)
- [License](#license)

---

## Features

| Feature | Description |
|---------|------------|
| Recipe Import | Paste any recipe URL — ingredients, instructions, and nutrition are extracted automatically via a Vercel serverless function |
| Manual Creation | Build recipes from scratch with custom ingredients, step-by-step instructions, and full nutrition data |
| Recipe Library | Browse, search, favorite, and filter recipes by meal type (breakfast, lunch, dinner, snacks) |
| Calorie Ring | Animated SVG calorie tracker on the dashboard — fill the ring throughout the day with color-coded macro breakdown |
| Meal Logging | Log recipes or individual foods to your daily diary with per-meal grouping and visual macro bars |
| Nutrition Goals | Set custom daily targets for calories, protein, carbs, and fat — progress bars update in real time |
| Food Search | Search across Open Food Facts, USDA FoodData Central, and Spoonacular simultaneously — no key required for Open Food Facts |
| Health Dashboard | Weight logging with Chart.js trend visualization, BMI calculation, and TDEE estimation based on your profile |
| Light / Dark Theme | System-aware `prefers-color-scheme` with floating manual toggle (sun/moon), persisted to `localStorage` |
| Notebook Aesthetic | Ruled paper background with red margin line, paper grain texture, and warm gradient washes — like a Moleskine journal |
| Custom Dialogs | Bottom-sheet modals with drag handle, keyboard support (Escape to close), and focus restoration |
| Toast Notifications | Rounded-rectangular toasts with success/error/warning color coding and auto-dismiss |
| Frosted Glass UI | `backdrop-filter: blur()` glassmorphism on cards, inputs, navigation, and the floating bottom bar |
| Local Storage | All recipes, meal logs, weight entries, and profile data persisted in `localStorage` — no account, no server, no sign-up |
| Responsive PWA | Mobile-first with a floating bottom nav bar; converts to a 240px sidebar on desktop (768px+) |
| Accessibility | `role="dialog"`, `role="tablist"`, `aria-modal`, `aria-selected`, skip-to-main-content link, `:focus-visible` glow rings, `prefers-reduced-motion`, heading hierarchy, WCAG 2.1 AA color contrast |
| No Build Step | Vanilla HTML, CSS, and JavaScript — no npm, no bundler, no framework; CSS `@layer` organization |

---

## Demo

To run locally:

```bash
git clone https://github.com/rhythmd22/Savor.git
cd Savor
python3 -m http.server 8080
```

Open `http://localhost:8080/` in your browser. For recipe URL extraction, run with `vercel dev` instead.

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
│   ├── styles.css              # Design tokens, reset, layout, components, theme overrides (1,556 lines)
│   ├── index.css               # Dashboard page (calorie ring, macros, meal entries)
│   ├── recipes.css             # Recipe list, search, filter chips, card grid
│   ├── recipe-detail.css       # Recipe detail (hero, nutrition grid, ingredients, instructions)
│   ├── import.css              # Recipe import (URL/manual/API tabs, form, spinner)
│   ├── meal-log.css            # Daily food diary (date selector, summary bars, search, entries)
│   └── health.css              # Health tracking (metrics, weight log, chart, profile form)
├── js/
│   ├── app.js                  # SPA router, navigation, page initialization
│   ├── theme.js                # Light/dark theme persistence and toggle
│   ├── data.js                 # localStorage CRUD (recipes, meal logs, weight entries, profile)
│   ├── utils.js                # Shared utilities: toast, dialog, debounce, formatting
│   ├── api.js                  # Recipe extraction, food search (Open Food Facts, USDA, Spoonacular)
│   ├── index.js                # Dashboard: calorie ring, macro breakdown, recent recipes, meal log summary
│   ├── recipes.js              # Recipe list: search, filter, sort, favorites
│   ├── recipe-detail.js        # Recipe detail: nutrition, ingredients, instructions, log/delete actions
│   ├── import.js               # Import page: URL extraction, manual create, API key management
│   ├── meal-log.js             # Food diary: date navigation, food search, meal entries, macro bars
│   └── health.js               # Health page: weight chart (Chart.js), profile, TDEE calculation
├── api/
│   └── recipe-extractor.js     # Vercel serverless function — extracts recipe data from URLs
├── bundle.js                   # Concatenated production bundle (all JS modules)
├── icon.svg                    # Vector PWA icon (source — used as favicon, apple-touch-icon, and maskable)
├── icon-maskable.svg                       # Maskable icon variant with safe-zone padding
├── android-chrome-192x192.png              # PWA icon 192x192 (light)
├── dark-android-chrome-192x192.png         # PWA icon 192x192 (dark)
├── android-chrome-512x512.png              # PWA icon 512x512 (light)
├── dark-android-chrome-512x512.png         # PWA icon 512x512 (dark)
├── android-chrome-maskable-192x192.png     # Android adaptive icon 192x192
├── android-chrome-maskable-512x512.png     # Android adaptive icon 512x512
├── apple-touch-icon.png                    # iOS home screen 180x180 (light)
├── apple-touch-icon-dark.png               # iOS home screen 180x180 (dark)
├── apple-touch-icon-120x120.png            # iOS home screen 120x120 (light)
├── apple-touch-icon-120x120-dark.png       # iOS home screen 120x120 (dark)
├── apple-touch-icon-152x152.png            # iOS home screen 152x152 (light)
├── apple-touch-icon-152x152-dark.png       # iOS home screen 152x152 (dark)
├── apple-touch-icon-167x167.png            # iOS home screen 167x167 (light)
├── apple-touch-icon-167x167-dark.png       # iOS home screen 167x167 (dark)
├── favicon.ico                             # Multi-resolution favicon (16+32+48)
├── manifest-light.json         # PWA Web App Manifest (light theme)
├── manifest-dark.json          # PWA Web App Manifest (dark theme)
├── service-worker.js           # Offline caching and install flow
├── vercel.json                 # Vercel deployment config (SPA rewrites + serverless function)
├── LICENSE
└── .gitignore
```

The app is a single-page application. All views live as `<template>` elements inside `index.html`. The router in `app.js` clones templates into `#app-root` on navigation. Data flows through `localStorage` via `data.js` and is consumed by page-specific init functions. There is no build step or bundler; `bundle.js` is a simple concatenation for production.

**Design decisions:**
- `<template>`-based SPA instead of multi-page HTML (keeps navigation instant)
- Inline SVG icons instead of icon libraries (zero external dependencies)
- `localStorage` for persistence (works offline, no server, no privacy concerns)
- `backdrop-filter` glassmorphism on all containers (modern iOS/Android feel)
- CSS `@layer` organization (tokens → reset → layout → components)
- `bundle.js` is a simple concatenation of all ES modules — no build step, no tree-shaking, just script concatenation
- `.glass` and `.glass-card` reusable CSS classes (consistent frosted effect everywhere)
- Notebook paper aesthetic: ruled lines, red margin, paper grain — thematically appropriate for recipes and journaling
- Floating bottom nav on mobile, sidebar on desktop — distinct from EcoFlow's edge-to-edge approach
- Bottom-sheet dialogs instead of center modals — more natural on mobile

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
| Iconography | Custom inline SVG icons (no icon library dependency) |
| Fonts | [Inter](https://fonts.google.com/specimen/Inter), [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (Google Fonts) |
| Hosting | Vercel (or any static host for client-only use) |
| PWA | Service Worker API, Web App Manifest |

No npm packages, no build steps, no framework. All visual effects (glassmorphism, notebook paper texture, calorie ring, progress bars, chart-like bars) are pure CSS. `bundle.js` is a simple concatenation of all JS modules for the production build.

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

### Recipe URL Extraction (Optional)

To enable automatic recipe extraction from URLs:

```bash
npx vercel dev
```

This starts the Vercel development environment with the `/api/recipe-extractor` serverless function. Without it, you can still create recipes manually.

### Food Search API Keys (Optional)

Food search works with Open Food Facts out of the box (no key). To enable additional sources:

1. Get a free key at [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup) or [Spoonacular](https://spoonacular.com/food-api/console)
2. Go to Import → API tab
3. Paste your key and tap Save

Keys are stored in `localStorage` on your device only and are never sent anywhere except directly to the respective APIs.

---

## API Integrations

### Recipe Extractor (Vercel Serverless)

- **Purpose:** Extract structured recipe data (title, ingredients, instructions, nutrition, image, cook time, servings) from any recipe URL
- **Endpoint:** `/api/recipe-extractor`
- **Key required:** No
- **Deployment:** Runs on Vercel; falls back to manual recipe creation when unavailable

### Open Food Facts

- **Purpose:** Product and ingredient lookup — nutrition facts, serving sizes, barcode search
- **Endpoint:** `https://world.openfoodfacts.org/`
- **Key required:** No
- **Use case:** Search for "chicken breast" or scan a barcode to get nutrition data per 100g

### USDA FoodData Central

- **Purpose:** Government nutrition database — raw ingredients, branded foods, lab-analyzed data
- **Endpoint:** `https://api.nal.usda.gov/fdc/v1/foods/search`
- **Key required:** Yes (free — [sign up](https://fdc.nal.usda.gov/api-key-signup))
- **Default:** Uses `DEMO_KEY` for testing (limited rate). Replace with your own key for production use.
- **Rate limit:** 1,000 requests/hour on free tier

### Spoonacular

- **Purpose:** Recipe extraction, ingredient parsing, meal planning, nutrition analysis
- **Endpoint:** `https://api.spoonacular.com/`
- **Key required:** Yes (free — [sign up](https://spoonacular.com/food-api/console))
- **Rate limit:** 50 points/day on free tier (no credit card required)

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