# SIGNAL - Smart Market Watchlist

> **"Don't just show users what changed. Help them understand what meaningfully changed since they last checked, why it matters, and what deserves their attention."**

SIGNAL is a competition-grade smart market watchlist built with Next.js (App Router, TypeScript), Tailwind CSS, PostgreSQL, and Prisma ORM.

---

## Key Features & Product Principles

1. **Meaningful Change Detection**: Filters out market noise (normal ±0.8% fluctuations) and surfaces true anomalies (price volatility spikes, 2.5x volume surges, 52-week high/low proximity).
2. **0–100 Attention Score**: Ranks stocks by urgency (`LOW`, `MEDIUM`, `HIGH`) with structured, human-readable explanations instead of black-box metrics or buy/sell recommendations.
3. **"Since Your Last Visit" Experience**: Summarizes what changed since the user last checked.
4. **Data Freshness & Transparency**: Clearly indicates whether data is `FRESH`, `DELAYED`, `STALE`, or `UNAVAILABLE`.
5. **Deterministic Demo Provider**: Provides reliable, repeatable market data for development and testing without hiding demo status.

---

## Architecture (Modular Monolith)

SIGNAL uses a clean modular monolith architecture inside `src/modules/`:

- `auth/`: User authentication, password hashing, JWT generation and cookie verification.
- `users/`: User profiles, visit logging (`UserVisit`), and baseline preferences.
- `watchlists/`: Management of user watchlists and watchlist stock items.
- `market-data/`: Provider abstraction (`MarketDataProvider`) and `DemoMarketDataProvider`.
- `snapshots/`: Market snapshot capture and time-series history storage.
- `change-detection/`: Independent anomaly detection engine comparing current movement against historical baselines.
- `attention-scoring/`: 0–100 Attention Score calculator and explainability generator.
- `user-preferences/`: User-configurable sensitivity levels (`LOW`, `BALANCED`, `HIGH`).

---

## Getting Started & Setup Instructions

### Prerequisites
- Node.js v18+ (Verified on v22.15.0)
- npm v10+ (Verified on 10.9.2)
- PostgreSQL database (or hosted instance e.g. Prisma Postgres / Supabase / Neon)

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is configured in `.env` or `prisma7.config.ts`.

### 3. Database Migration & Client Generation
Run Prisma migration and generate the Prisma Client:
```bash
npx prisma db push
```

### 4. Running Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Health Check
Verify the backend system health and market data provider status:
```bash
curl http://localhost:3000/api/health
```

---

## License
Built for competition demo. All rights reserved.
