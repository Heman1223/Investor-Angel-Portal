# PortfolioOS — Private Angel Investor Portfolio Intelligence

A secure, login-protected web-based portfolio management portal for angel investors. Replaces spreadsheet-based tracking with automated financial analytics.

## Features

- 📊 **Real-time Dashboard** — Total Invested, Portfolio Value, MOIC, XIRR, sector allocation
- 📈 **Automated Calculations** — XIRR, MOIC, CAGR, TVPI computed from cashflow records
- 🏢 **Startup Tracking** — Full lifecycle: investment → follow-on → monthly updates → exit
- 🚨 **Risk Alerts** — Runway warnings, revenue drops, overdue updates, negative IRR
- 📁 **Document Vault** — Secure storage for SHA, term sheets, cap tables, financials
- ⚙️ **Settings** — Profile, security, alert thresholds, data export, audit log

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS v4 |
| Charts | Recharts |
| State | TanStack Query (React Query v5) |

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally (or provide a MongoDB Atlas URI)

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (or use the one provided):
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/portfolioos
JWT_SECRET=your-64-byte-secret
JWT_REFRESH_SECRET=your-64-byte-refresh-secret
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
```

Seed the database with demo data:
```bash
npx ts-node src/seed.ts
```

Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Login

Open http://localhost:5173

**Demo credentials:**
- Email: `investor@portfolioos.com`
- Password: `Demo@2024`

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handling
│   │   ├── services/        # ALL business logic & financial calculations
│   │   ├── models/          # 9 Mongoose schemas
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Auth, rate limiting, audit logging
│   │   ├── validators/     # Zod schemas
│   │   ├── jobs/           # Cron jobs (daily alert checks)
│   │   ├── utils/          # Logger
│   │   ├── db.ts           # MongoDB connection
│   │   ├── app.ts          # Express app
│   │   ├── server.ts       # Entry point
│   │   └── seed.ts         # Demo data seeder
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # 7 page components
│   │   ├── components/     # Layout + UI components
│   │   ├── context/        # Auth context
│   │   ├── services/       # Axios API client
│   │   ├── utils/          # Formatters
│   │   └── App.tsx         # Root with routing
│   └── .env.example
│
└── README.md
```

## API Endpoints

| Category | Endpoint | Auth |
|----------|----------|------|
| Auth | `POST /api/auth/login` | Public |
| Auth | `POST /api/auth/refresh` | Public |
| Dashboard | `GET /api/dashboard` | ✅ |
| Startups | `GET/POST /api/startups` | ✅ |
| Startup Detail | `GET/PUT /api/startups/:id` | ✅ |
| Exit | `POST /api/startups/:id/exit` | ✅ |
| Follow-on | `POST /api/startups/:id/follow-on` | ✅ |
| Updates | `GET/POST /api/startups/:id/updates` | ✅ |
| Alerts | `GET /api/alerts` | ✅ |
| Documents | `GET/POST /api/startups/:id/documents` | ✅ |
| Settings | `GET/PUT /api/settings/*` | ✅ |

## Seed Data

The seed script creates:
- 1 demo investor (Arjun Mehta)
- 5 startups: Finly (FinTech), HealthNode (HealthTech), EduStack (EdTech), GreenLoop (CleanTech, exited), CropMind (AgriTech)
- Cashflows for each investment + GreenLoop exit
- 3 months of monthly updates per active startup
- RUNWAY alerts for HealthNode (low cash balance)
- Sample documents per startup
"# Investor-Angel-Portal" 
