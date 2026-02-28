# Studio Board

Real-time collaborative whiteboard with persistent storage in Supabase Postgres.

## Quick Start

1. Create a Supabase project and apply the schema in `Plan.md`.
2. Copy `.env.example` to `.env` and set your Supabase credentials.

```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
VITE_SERVER_URL=http://localhost:3001
```

## Install

```
npm --prefix server install
npm --prefix client install
npm --prefix shared install
```

## Run

```
npm run dev
```

Server runs at `http://localhost:3001`, client at `http://localhost:5173`.
