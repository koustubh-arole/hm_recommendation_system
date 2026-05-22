# H&M Retail AI — Frontend

Premium AI retail dashboard built with Next.js 14, TypeScript, and a bespoke dark luxury design system.

## Tech Stack
- **Next.js 14** App Router + TypeScript
- **Zustand** – auth + cart state
- **Axios** – API layer with JWT interceptors + retry logic
- **Recharts** – interactive analytics charts
- **Sonner** – toast notifications
- **Custom CSS design system** – no Tailwind dependency at runtime

## Design System Tokens
Defined in `app/globals.css`:
```
--gold / --gold2       Premium gold accent
--bg / --bg2 / --bg3   Background layers
--sur / --sur2 / --sur3 Surface layers
--bor / --bor2 / --bor3 Borders
--tx / --tx2 / --tx3    Text hierarchy
```

## Pages

### Auth
| Route | Description |
|-------|-------------|
| `/login` | Role-selector login with demo credentials |
| `/register` | Admin account creation |

### Admin Dashboard
| Route | Backend Endpoint | Data Source |
|-------|-----------------|-------------|
| `/overview` | `/api/admin/cluster-stats` | rfm_segmented.csv |
| `/analytics` | `/api/admin/cluster-recommendations` | cluster_recommendations.csv |
| `/forecasting` | `/api/admin/forecast` | forecast_output.csv |
| `/pipelines` | `/api/admin/retrain` | Pipeline scripts |
| `/users` | `/auth/users` | users.db |
| `/system` | `/api/admin/health` | All services |

### User Dashboard
| Route | Backend Endpoint | Data Source |
|-------|-----------------|-------------|
| `/home` | `/api/trending/7d` | top_products_7d.csv |
| `/recommendations` | `/api/recommendations/:id` | user_recommendations.csv |
| `/products` | `/api/products` | article_lookup.csv |
| `/search` | `/api/search` | ChromaDB embeddings |
| `/wishlist` | Local state | — |
| `/cart` | Local state | — |

## Quick Start

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev
```

Ensure FastAPI is running on port 8000:
```bash
cd ..
uvicorn api.main:app --reload --port 8000
```

## Project Structure
```
app/
  login/            Auth pages
  register/
  overview/         Admin pages
  analytics/
  forecasting/
  pipelines/
  users/
  system/
  home/             User pages
  products/
  recommendations/
  search/
  wishlist/
  cart/
components/
  layout/           Sidebar, Navbar, DashboardShell
  ui/               KpiCard, ProductCard, Skeletons, ErrorBoundary, EmptyState
hooks/              useFetch, useDebounce, useLocalStorage
services/           api.ts — Axios with JWT + retry
store/              authStore, cartStore (Zustand)
lib/                utils.ts — formatters, helpers
types/              index.ts — all TypeScript types
```
