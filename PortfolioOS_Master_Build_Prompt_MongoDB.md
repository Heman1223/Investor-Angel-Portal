
### Private Angel Investor Portfolio Tracking Portal

## PART 1 — PROJECT IDENTITY

You are building **PortfolioOS** — a private, secure, login-protected investment intelligence
platform for a single angel investor.

The system replaces spreadsheet-based portfolio tracking with:
- Automated IRR/XIRR/MOIC financial calculations
- Real-time portfolio analytics dashboard
- Structured monthly founder updates
- Document vault per startup
- Configurable risk alerts
- Professional PDF reporting

**Primary user:** A single, non-technical angel investor. The UI must be clean, minimal, and
intuitive. No financial jargon clutter. No overwhelming charts. Every metric must be
auto-calculated — the user must never reach for a calculator.

**Architecture constraint:** V1 is single-investor but the codebase must be written for
multi-investor SaaS from day one. Every document has an `investorId` field. Every query is
scoped by `investorId`. No hardcoded single-user assumptions anywhere.

---

## PART 2 — TECHNOLOGY STACK

Use exactly this stack. Do not substitute without explicit instruction.

**Backend**
- Runtime: Node.js (v20+)
- Framework: Express.js
- Database: MongoDB (v7+) — use MongoDB Atlas for hosting (free tier is fine for dev)
- ODM: Mongoose (v8+)
- Auth: JWT (access token 15 min, refresh token 7 days in httpOnly cookie)
- Password hashing: bcrypt (minimum 12 salt rounds)
- Validation: Zod on all API endpoints
- Logging: Winston (structured JSON logs)
- Testing: Jest for all service-layer functions
- File storage: Local filesystem in dev; abstract behind a StorageService interface so S3/Cloudinary can be swapped in for production
- Scheduled jobs: node-cron (for daily alert checks)

**Frontend**
- Framework: React 18 + TypeScript
- Styling: TailwindCSS
- Server state: TanStack Query (React Query v5)
- Forms: React Hook Form + Zod resolvers
- Charts: Recharts
- HTTP client: Axios with request/response interceptors
- PDF generation: Puppeteer (server-side) — generation must always be server-side
- Icons: Lucide React

**Dev tooling**
- Monorepo: `/backend` and `/frontend` folders at root
- Environment: `.env` files, never committed. Provide `.env.example` for both.
- Seed script: `backend/src/seed.ts` with realistic demo data
- MongoDB connection string in `MONGODB_URI` env variable

**Important MongoDB note:**
MongoDB does not enforce foreign key constraints at the database level. Referential integrity
(e.g. a cashflow always belonging to a valid startup) is enforced by Mongoose middleware and
the service layer. Be disciplined — always validate that referenced documents exist before
creating related documents.

---

## PART 3 — PROJECT STRUCTURE

Scaffold exactly this folder structure:

```
portfolioos/
├── backend/
│   ├── src/
│   │   ├── controllers/        # Request parsing, response formatting only
│   │   ├── services/           # ALL business logic and ALL financial calculations
│   │   ├── models/             # Mongoose schemas and models
│   │   ├── routes/             # Express route definitions
│   │   ├── middleware/         # Auth (JWT), rate limiting, audit logging
│   │   ├── utils/              # Pure helper functions (math, formatters, date)
│   │   ├── validators/         # Zod schemas for every endpoint
│   │   ├── jobs/               # node-cron scheduled jobs
│   │   ├── db.ts               # MongoDB connection setup
│   │   └── app.ts              # Express app setup
│   ├── tests/
│   │   └── services/           # Unit tests for every service function
│   ├── src/seed.ts             # Demo data seeder
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/              # One file per route/view
│   │   ├── components/
│   │   │   ├── ui/             # Primitives: Button, Input, Card, Badge, Modal
│   │   │   ├── charts/         # Recharts wrappers
│   │   │   └── layout/         # Sidebar, Header, PageWrapper
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Axios API call functions
│   │   ├── types/              # TypeScript interfaces matching backend responses
│   │   ├── utils/              # Formatters (currency, percentage, date)
│   │   └── App.tsx
│   └── .env.example
│
└── README.md
```

**Architectural law — enforce at all times:**
- `controllers/` call `services/`. Never touch models directly from controllers.
- `services/` contain ALL financial calculations. Zero financial logic anywhere else.
- `models/` do data access only. No business logic inside models.
- Frontend displays pre-formatted values from the API. Never recalculates metrics client-side.

---

## PART 4 — MONGOOSE SCHEMAS

Implement all schemas in `backend/src/models/`. Every monetary value is stored as a plain
JavaScript `Number` representing the value in the **smallest currency unit** (paise for INR).

> **Why not floats for money?** Standard JS `Number` is a 64-bit float but is safe for integers
> up to 2^53 (~9 quadrillion). Storing ₹10,00,000 as `100000000` paise is well within safe
> integer range for angel investing amounts. Always store and compute in paise — only convert
> to rupees for display.

---

### 4.1 Investor Schema — `models/Investor.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestor extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'investor' | 'admin' | 'founder';
  subscriptionTier: 'solo' | 'pro' | 'enterprise';
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  lastLoginAt?: Date;
  passwordResetToken?: string;      // Stored as bcrypt hash, never plain text
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvestorSchema = new Schema<IInvestor>({
  name:                 { type: String, required: true, trim: true },
  email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:         { type: String, required: true },
  role:                 { type: String, enum: ['investor', 'admin', 'founder'], default: 'investor' },
  subscriptionTier:     { type: String, enum: ['solo', 'pro', 'enterprise'], default: 'solo' },
  twoFactorSecret:      { type: String },
  twoFactorEnabled:     { type: Boolean, default: false },
  lastLoginAt:          { type: Date },
  passwordResetToken:   { type: String },   // Hashed. Set on forgot-password, cleared after use.
  passwordResetExpires: { type: Date },
}, { timestamps: true });

export const Investor = mongoose.model<IInvestor>('Investor', InvestorSchema);
```

---

### 4.2 Startup Schema — `models/Startup.ts`

```typescript
export interface IStartup extends Document {
  investorId: mongoose.Types.ObjectId;   // Every document scoped to investor
  name: string;
  sector: string;
  stage: 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Growth' | 'Pre-IPO';
  status: 'active' | 'exited' | 'written_off' | 'watchlist';
  entryValuation: number;               // In paise
  currentValuation: number;             // In paise — updated manually or via monthly update
  equityPercent: number;                // Initial equity % at first investment (e.g. 10.5)
  currentEquityPercent: number;         // Latest equity % after all dilution events
  investmentDate: Date;
  description?: string;
  website?: string;
  founderName?: string;
  founderEmail?: string;                // Reserved for future founder portal
  createdAt: Date;
  updatedAt: Date;
}

const StartupSchema = new Schema<IStartup>({
  investorId:           { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
  name:                 { type: String, required: true, trim: true },
  sector:               { type: String, required: true },
  stage:                { type: String, enum: ['Pre-Seed','Seed','Series A','Series B','Series C','Growth','Pre-IPO'], required: true },
  status:               { type: String, enum: ['active','exited','written_off','watchlist'], default: 'active' },
  entryValuation:       { type: Number, required: true, min: 0 },
  currentValuation:     { type: Number, required: true, min: 0 },
  equityPercent:        { type: Number, required: true, min: 0, max: 100 },
  currentEquityPercent: { type: Number, required: true, min: 0, max: 100 },
  investmentDate:       { type: Date, required: true },
  description:          { type: String },
  website:              { type: String },
  founderName:          { type: String },
  founderEmail:         { type: String },
}, { timestamps: true });

// Compound index for fast investor-scoped queries
StartupSchema.index({ investorId: 1, status: 1 });
StartupSchema.index({ investorId: 1, sector: 1 });

export const Startup = mongoose.model<IStartup>('Startup', StartupSchema);
```

---

### 4.3 Cashflow Schema — `models/Cashflow.ts`
**This is the financial core. All analytics derive from this collection.**

```typescript
export interface ICashflow extends Document {
  investorId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  amount: number;           // NEGATIVE = outflow (investment). POSITIVE = inflow (exit/dividend)
  date: Date;               // Actual transaction date — critical for XIRR accuracy
  type: 'investment' | 'follow_on' | 'exit' | 'dividend' | 'write_off';
  roundName?: string;       // e.g. "Seed Round", "Series A Follow-on"
  valuationAtTime?: number; // Valuation when this cashflow occurred, in paise
  equityAcquired?: number;  // Equity % acquired in this specific transaction
  currency: string;         // ISO 4217. Default: 'INR'
  notes?: string;           // Audit trail description
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CashflowSchema = new Schema<ICashflow>({
  investorId:     { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
  startupId:      { type: Schema.Types.ObjectId, ref: 'Startup',  required: true, index: true },
  amount:         { type: Number, required: true },
  date:           { type: Date, required: true },
  type:           { type: String, enum: ['investment','follow_on','exit','dividend','write_off'], required: true },
  roundName:      { type: String },
  valuationAtTime:{ type: Number },
  equityAcquired: { type: Number, min: 0, max: 100 },
  currency:       { type: String, default: 'INR', maxlength: 3 },
  notes:          { type: String },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
}, { timestamps: true });

CashflowSchema.index({ investorId: 1, date: 1 });
CashflowSchema.index({ startupId: 1, date: 1 });

export const Cashflow = mongoose.model<ICashflow>('Cashflow', CashflowSchema);
```

---

### 4.4 DilutionEvent Schema — `models/DilutionEvent.ts`
**Dilution is event-based — each round that dilutes the investor creates one record.**

```typescript
export interface IDilutionEvent extends Document {
  startupId: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  roundName: string;
  date: Date;
  preDilutionEquity: number;    // Equity % before this round
  postDilutionEquity: number;   // Equity % after this round
  newInvestor?: string;         // Who led this round
  roundValuation?: number;      // Post-money valuation of the round, in paise
  notes?: string;
  createdAt: Date;
}

const DilutionEventSchema = new Schema<IDilutionEvent>({
  startupId:          { type: Schema.Types.ObjectId, ref: 'Startup',  required: true, index: true },
  investorId:         { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
  roundName:          { type: String, required: true },
  date:               { type: Date, required: true },
  preDilutionEquity:  { type: Number, required: true, min: 0, max: 100 },
  postDilutionEquity: { type: Number, required: true, min: 0, max: 100 },
  newInvestor:        { type: String },
  roundValuation:     { type: Number },
  notes:              { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } }); // Immutable — no updatedAt

export const DilutionEvent = mongoose.model<IDilutionEvent>('DilutionEvent', DilutionEventSchema);
```

---

### 4.5 MonthlyUpdate Schema — `models/MonthlyUpdate.ts`

```typescript
export interface IMonthlyUpdate extends Document {
  startupId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  month: string;              // Format: YYYY-MM. Enforced by Zod validator.
  revenue: number;            // Monthly revenue in paise
  burnRate: number;           // Monthly net cash burn in paise
  cashBalance: number;        // REQUIRED. Cash currently in bank. Runway = cashBalance / burnRate.
  runwayMonths?: number;      // Computed on save. Stored for fast querying.
  valuationUpdate?: number;   // If provided, updates Startup.currentValuation
  notes?: string;
  createdAt: Date;
}

const MonthlyUpdateSchema = new Schema<IMonthlyUpdate>({
  startupId:       { type: Schema.Types.ObjectId, ref: 'Startup',  required: true },
  submittedBy:     { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
  month:           { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  revenue:         { type: Number, required: true, min: 0 },
  burnRate:        { type: Number, required: true, min: 0 },
  cashBalance:     { type: Number, required: true },
  runwayMonths:    { type: Number },
  valuationUpdate: { type: Number },
  notes:           { type: String, maxlength: 1000 },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Prevent duplicate monthly submissions for the same startup
MonthlyUpdateSchema.index({ startupId: 1, month: 1 }, { unique: true });

export const MonthlyUpdate = mongoose.model<IMonthlyUpdate>('MonthlyUpdate', MonthlyUpdateSchema);
```

---

### 4.6 Document Schema — `models/Document.ts`

```typescript
export type DocumentType = 'sha' | 'term_sheet' | 'cap_table' | 'legal' | 'financial_statement' | 'other';
// sha = Shareholders Agreement / Share Subscription Agreement

export interface IDocument extends Document {
  startupId: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  fileName: string;
  fileKey: string;          // Storage path or S3 key. Never expose this directly in API responses.
  fileSizeBytes: number;
  mimeType: string;
  documentType: DocumentType;
  description?: string;
  uploadedBy: mongoose.Types.ObjectId;
  isArchived: boolean;      // Soft delete flag
  uploadedAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  startupId:    { type: Schema.Types.ObjectId, ref: 'Startup',  required: true, index: true },
  investorId:   { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
  fileName:     { type: String, required: true },
  fileKey:      { type: String, required: true, unique: true },
  fileSizeBytes:{ type: Number, required: true },
  mimeType:     { type: String, required: true },
  documentType: { type: String, enum: ['sha','term_sheet','cap_table','legal','financial_statement','other'], required: true },
  description:  { type: String },
  uploadedBy:   { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
  isArchived:   { type: Boolean, default: false },
}, { timestamps: { createdAt: 'uploadedAt', updatedAt: false } });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
```

---

### 4.7 AlertConfiguration Schema — `models/AlertConfiguration.ts`
**All thresholds are configurable per investor. No hardcoded values in the alert engine.**

```typescript
export interface IAlertConfiguration extends Document {
  investorId: mongoose.Types.ObjectId;
  runwayWarningMonths: number;      // Default: 6
  runwayCriticalMonths: number;     // Default: 3
  revenueDropWarningPct: number;    // Default: 15  (meaning 15%)
  updateOverdueDays: number;        // Default: 45
  irrNegativeThresholdPct: number;  // Default: -20 (meaning -20%)
  moicWarningThreshold: number;     // Default: 0.75
  updatedAt: Date;
}

const AlertConfigSchema = new Schema<IAlertConfiguration>({
  investorId:              { type: Schema.Types.ObjectId, ref: 'Investor', required: true, unique: true },
  runwayWarningMonths:     { type: Number, default: 6 },
  runwayCriticalMonths:    { type: Number, default: 3 },
  revenueDropWarningPct:   { type: Number, default: 15 },
  updateOverdueDays:       { type: Number, default: 45 },
  irrNegativeThresholdPct: { type: Number, default: -20 },
  moicWarningThreshold:    { type: Number, default: 0.75 },
}, { timestamps: { createdAt: false, updatedAt: true } });

export const AlertConfiguration = mongoose.model<IAlertConfiguration>('AlertConfiguration', AlertConfigSchema);
```

---

### 4.8 Alert Schema — `models/Alert.ts`

```typescript
export interface IAlert extends Document {
  investorId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  alertType: 'RUNWAY_CRITICAL' | 'RUNWAY_WARNING' | 'CASH_ZERO' | 'REVENUE_DROP' | 'UPDATE_OVERDUE' | 'IRR_NEGATIVE' | 'MOIC_LOW';
  severity: 'RED' | 'YELLOW';
  message: string;
  isRead: boolean;
  triggeredAt: Date;
  resolvedAt?: Date;
}

const AlertSchema = new Schema<IAlert>({
  investorId:  { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
  startupId:   { type: Schema.Types.ObjectId, ref: 'Startup',  required: true },
  alertType:   { type: String, enum: ['RUNWAY_CRITICAL','RUNWAY_WARNING','CASH_ZERO','REVENUE_DROP','UPDATE_OVERDUE','IRR_NEGATIVE','MOIC_LOW'], required: true },
  severity:    { type: String, enum: ['RED','YELLOW'], required: true },
  message:     { type: String, required: true },
  isRead:      { type: Boolean, default: false, index: true },
  triggeredAt: { type: Date, default: Date.now },
  resolvedAt:  { type: Date },
});

// Deduplication index — prevents duplicate unread alerts of same type for same startup
AlertSchema.index({ startupId: 1, alertType: 1, isRead: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
```

---

### 4.9 AuditLog Schema — `models/AuditLog.ts`
**Append-only. Never update or delete audit log documents.**

```typescript
export interface IAuditLog extends Document {
  investorId: mongoose.Types.ObjectId;
  action: string;          // e.g. CREATE_INVESTMENT, UPDATE_VALUATION, RECORD_EXIT
  entityType: string;      // startup | cashflow | document | monthly_update
  entityId: string;        // MongoDB ObjectId as string
  oldValue?: object;       // Snapshot before change (omit for creates)
  newValue?: object;       // Snapshot after change (omit for deletes)
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  investorId:  { type: Schema.Types.ObjectId, ref: 'Investor', required: true, index: true },
  action:      { type: String, required: true },
  entityType:  { type: String, required: true },
  entityId:    { type: String, required: true },
  oldValue:    { type: Schema.Types.Mixed },
  newValue:    { type: Schema.Types.Mixed },
  ipAddress:   { type: String },
  userAgent:   { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

// No update or delete allowed — enforced at application layer in middleware
AuditLogSchema.index({ investorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
```

---

## PART 5 — FINANCIAL CALCULATIONS

Implement all functions in `backend/src/services/financials.service.ts`.
Write unit tests for every function in `tests/services/financials.service.test.ts`.
**Zero financial logic anywhere else in the codebase.**

All inputs/outputs use **paise (smallest unit)**. Conversion to rupees is only for display.

---

### 5.1 XIRR — Primary return metric

```typescript
/**
 * Calculate XIRR using bisection method.
 * @param cashflows [{amount: number, date: Date}] — sorted ascending by date
 *   Investments = NEGATIVE amounts. Exits/current value = POSITIVE amounts.
 * @returns Rate as decimal (0.25 = 25%) or null if calculation fails
 */
function calculateXIRR(cashflows: { amount: number; date: Date }[]): number | null
```

**Algorithm:**
1. Return `null` if fewer than 2 cashflows
2. Return `null` if all cashflows share the same date
3. Set reference date = `cashflows[0].date`
4. `yearFrac(d) = daysBetween(reference, d) / 365.25`
5. `NPV(rate) = Σ [ cf.amount / (1 + rate)^yearFrac(cf.date) ]`
6. Bisect between `lo = -0.999` and `hi = 10.0` for 200 iterations
7. Return `mid` when `|NPV(mid)| < 0.001`
8. Return `null` on non-convergence

**Edge cases — all required:**
| Scenario | Return value |
|----------|-------------|
| Fewer than 2 cashflows | `null` |
| All cashflows same date | `null` |
| Current value = invested amount exactly | `0.0` |
| Exit value = 0 (write-off) | `-1.0` |
| No convergence after 200 iterations | `null` |

**For active startups:** Add a synthetic terminal cashflow:
`{ amount: currentValue, date: new Date() }`
where `currentValue = investedAmount * (currentValuation / entryValuation)`

### 5.2 MOIC

```typescript
// MOIC = currentValue / totalInvested
// Active: currentValue = sum(investedAmounts) * (currentValuation / entryValuation)
// Exited: currentValue = sum of exit cashflows (positive amounts)
// Portfolio MOIC: sum(all currentValues) / sum(all investedAmounts)
function calculateMOIC(totalInvested: number, currentValue: number): number
```

### 5.3 CAGR

```typescript
// CAGR = (currentValue / investedAmount)^(1 / yearsHeld) - 1
// yearsHeld = days(investmentDate → today or exitDate) / 365.25
// Enforce minimum yearsHeld = 0.1 to avoid division artifacts
function calculateCAGR(invested: number, current: number, yearsHeld: number): number
```

### 5.4 TVPI

```typescript
// TVPI = (unrealisedValue + realisedReturns) / totalPaidIn
// unrealisedValue = sum of active startup current values
// realisedReturns = sum of all positive exit cashflows
// totalPaidIn = absolute sum of all investment + follow_on cashflows
function calculateTVPI(unrealisedValue: number, realisedReturns: number, totalPaidIn: number): number
```

### 5.5 Runway

```typescript
// Runway (months) = cashBalance / burnRate
// burnRate = 0  → return Infinity (no burn)
// cashBalance <= 0 → return 0
// Round result to 1 decimal place
function calculateRunway(cashBalance: number, burnRate: number): number
```

### 5.6 Revenue Change MoM

```typescript
// Returns change as decimal (0.15 = +15%, -0.20 = -20%)
// previousRevenue = 0 → return null (no meaningful comparison)
function calculateRevenueChangeMoM(latestRevenue: number, previousRevenue: number): number | null
```

### 5.7 Unrealised Gain/Loss

```typescript
// unrealisedGain = currentValue - totalInvested
// currentValue = totalInvested * (currentValuation / entryValuation)
function calculateUnrealisedGain(totalInvested: number, currentValuation: number, entryValuation: number): number
```

### 5.8 Portfolio Analytics Aggregation

Build `getPortfolioAnalytics(investorId: string)` in `analytics.service.ts`:

```typescript
// Returns:
{
  totalInvested: number,
  currentPortfolioValue: number,
  unrealisedGain: number,
  portfolioMOIC: number,
  portfolioXIRR: number | null,
  portfolioTVPI: number,
  activeCount: number,
  exitedCount: number,
  sectorAllocation: { sector: string; invested: number; currentValue: number }[],
  startupMetrics: StartupMetric[]  // Per-startup computed metrics array
}
```

**Cache this in memory (or Redis if available) with 30-second TTL.**
**Invalidate the cache immediately on any Cashflow write.**

---

## PART 6 — API ENDPOINTS

Apply JWT auth middleware to every route except the four public auth routes listed below.
All responses follow the standard format in Part 14.

### Authentication
```
POST   /api/auth/login               Public. Return { accessToken }. Set refreshToken cookie.
POST   /api/auth/logout              Auth. Clear refresh token cookie.
POST   /api/auth/refresh             Public. Use httpOnly cookie to issue new accessToken.
POST   /api/auth/forgot-password     Public. Send reset email.
POST   /api/auth/reset-password      Public. Validate token, hash new password, clear token.
GET    /api/auth/me                  Auth. Return current investor profile (no passwordHash).
```

### Dashboard
```
GET    /api/dashboard                Auth. Return cached portfolio analytics.
```

### Startups
```
GET    /api/startups                 Auth. All startups with computed metrics. Supports ?status=active|exited
POST   /api/startups                 Auth. Create startup + initial investment cashflow atomically.
GET    /api/startups/:id             Auth. Single startup with full computed metrics.
PUT    /api/startups/:id             Auth. Update startup details. Write audit log.
DELETE /api/startups/:id             Auth. Soft delete (set status = written_off). Write audit log.
POST   /api/startups/:id/exit        Auth. Record exit. Create cashflow, update status, calc final metrics.
POST   /api/startups/:id/follow-on   Auth. Add follow-on investment + dilution event.
PUT    /api/startups/:id/valuation   Auth. Update currentValuation. Write audit log.
```

### Monthly Updates
```
GET    /api/startups/:id/updates     Auth. All updates for startup, sorted descending.
POST   /api/startups/:id/updates     Auth. Submit update. Trigger alert engine. Update valuation if provided.
```

### Cashflows
```
GET    /api/startups/:id/cashflows   Auth. All cashflows for one startup, sorted by date asc.
GET    /api/cashflows                Auth. All cashflows across entire portfolio.
```

### Documents
```
GET    /api/startups/:id/documents   Auth. All non-archived documents for startup.
POST   /api/startups/:id/documents   Auth. Upload. multipart/form-data. Max 25 MB.
GET    /api/documents/:id/download   Auth. Return a 15-min temporary download URL (never raw fileKey).
DELETE /api/documents/:id            Auth. Soft delete (isArchived = true).
```

### Alerts
```
GET    /api/alerts                   Auth. All alerts for investor. Supports ?isRead=false
PUT    /api/alerts/:id/read          Auth. Mark single alert as read.
PUT    /api/alerts/read-all          Auth. Mark all alerts as read.
GET    /api/alerts/config            Auth. Get alert configuration.
PUT    /api/alerts/config            Auth. Update alert thresholds.
```

### Settings
```
GET    /api/settings                 Auth. Investor profile + preferences.
PUT    /api/settings/profile         Auth. Update name.
PUT    /api/settings/password        Auth. Change password (requires current password).
GET    /api/settings/audit-log       Auth. Paginated audit log. ?page=1&limit=20
GET    /api/settings/export          Auth. Export all investor data as JSON.
```

### Reports
```
POST   /api/reports/portfolio        Auth. Generate portfolio PDF. Returns job ID.
GET    /api/reports/:jobId           Auth. Download completed PDF.
POST   /api/reports/startup/:id      Auth. Generate startup-level PDF.
```

---

## PART 7 — ALERT ENGINE

Implement in `backend/src/services/alerts.service.ts`.

### When to run
- After every `POST /api/startups/:id/updates` save
- After every cashflow write (investment, follow-on, exit)
- Daily cron job at 08:00 local time — check for overdue updates across all active startups

### Alert conditions

Read all thresholds from `AlertConfiguration` for the investor. If no config document exists,
create one with defaults on first use.

| Alert Type | Trigger Condition | Severity |
|------------|-------------------|----------|
| `RUNWAY_CRITICAL` | `runwayMonths < runwayCriticalMonths` | RED |
| `RUNWAY_WARNING` | `runwayMonths < runwayWarningMonths` | YELLOW |
| `CASH_ZERO` | `cashBalance <= 0` | RED (always on, no config) |
| `REVENUE_DROP` | `MoM revenue drop % > revenueDropWarningPct` | YELLOW |
| `UPDATE_OVERDUE` | `daysSinceLastUpdate > updateOverdueDays` | YELLOW |
| `IRR_NEGATIVE` | `startupXIRR * 100 < irrNegativeThresholdPct` | RED |
| `MOIC_LOW` | `startupMOIC < moicWarningThreshold` | YELLOW |

### Deduplication rule
Before inserting any alert:
```typescript
const existing = await Alert.findOne({
  startupId,
  alertType,
  isRead: false
});
if (existing) return; // Do not create duplicate
```

### Message templates (use these exactly)
```
RUNWAY_CRITICAL  → "{startupName}: Critical — runway is only {X} months"
RUNWAY_WARNING   → "{startupName}: Runway dropping — {X} months remaining"
CASH_ZERO        → "{startupName}: Cash balance is zero or negative — immediate action needed"
REVENUE_DROP     → "{startupName}: Revenue dropped {X}% vs last month"
UPDATE_OVERDUE   → "{startupName}: No founder update received in {X} days"
IRR_NEGATIVE     → "{startupName}: IRR has turned negative ({X}%)"
MOIC_LOW         → "{startupName}: MOIC below threshold ({X}x)"
```

---

## PART 8 — FRONTEND PAGES & COMPONENTS

### 8.1 Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | Email + password, show/hide toggle, demo credentials hint |
| `/` | `DashboardPage` | Mission Control — all metrics and charts |
| `/portfolio` | `PortfolioPage` | All startups table, search, filter by status/sector |
| `/portfolio/:id` | `StartupDetailPage` | Full detail — metrics, cashflows, updates, dilution, docs |
| `/analytics` | `AnalyticsPage` | MOIC distribution bar chart, sector comparison |
| `/updates` | `UpdatesPage` | All monthly updates across portfolio |
| `/alerts` | `AlertsPage` | All alerts, unread highlighted, mark as read |
| `/documents` | `DocumentsPage` | All documents across portfolio with filters |
| `/settings` | `SettingsPage` | Tabs: Profile · Security · Risk Config · Data Export · Audit Log |

### 8.2 Dashboard layout — implement exactly this

```
━━━ Alert Banner (only shown when unread RED alerts exist) ━━━━━━━━━━━━━━━━

[Total Invested]  [Portfolio Value]  [Portfolio MOIC]  [Portfolio XIRR]

[Active: N]  [Exited: N]  [Alerts: N  🔴]

[Portfolio Value Trend — area chart]  |  [Sector Allocation — donut chart]

[Portfolio Companies Table]
  Columns: Name · Sector · Stage · Invested · Current Value · MOIC · IRR · Status
  Clicking a row opens StartupDetailPage
```

### 8.3 Reusable UI components — build as primitives

```
MetricCard        Label + large value + sub-label + optional coloured left border
StatBadge         Compact number + label pill
AlertBanner       Red/yellow bar with icon and message — dismissable
DataTable         Sortable, with loading skeleton rows
EmptyState        Icon + heading + description + optional CTA button
Modal             Accessible overlay, trap focus, Escape to close
FormField         Label + Input/Select/Textarea + inline error message
CurrencyInput     Number input that formats as ₹ with Indian number system on blur
ConfirmDialog     Destructive action double-confirmation with typed warning
LoadingSkeleton   Shimmer placeholder for async content
StatusBadge       Active=green · Exited=gold · Written Off=red · Watchlist=yellow
SeverityBadge     RED=red pill · YELLOW=amber pill
RunwayIndicator   Coloured bar + months value, changes colour by threshold
```

### 8.4 Empty states — all six required

| Screen | Message | CTA |
|--------|---------|-----|
| Dashboard | "Your portfolio is empty. Add your first investment to get started." | `+ Add First Investment` |
| Portfolio | "No startups yet. Track your first investment here." | `+ Add Investment` |
| Updates | "No founder updates yet. Start tracking monthly metrics." | `+ Add Update` |
| Alerts | "All clear. No risk flags in your portfolio." | Green checkmark, no CTA |
| Documents | "No documents uploaded yet. Organise your investment agreements here." | `+ Upload Document` |
| Analytics | "Add at least 2 investments to see portfolio analytics." | Link to Portfolio |

---

## PART 9 — KEY USER FLOWS

### Flow 1: Add New Investment
1. Click `+ Add Investment`
2. Form: Startup Name, Sector, Stage, Investment Date, Entry Valuation (₹), Amount Invested (₹), Equity %
3. Optional: Description, Founder Name, Founder Email
4. On submit → `POST /api/startups`
5. Backend: create Startup doc + Cashflow doc (negative, type=`investment`) in one operation
6. Frontend: invalidate dashboard query → redirect to new startup detail page
7. Startup loads with MOIC = 1.00x, XIRR = 0%

### Flow 2: Monthly Update
1. Open startup → `Add Update`
2. Form: Month picker, Revenue (₹), Burn Rate (₹), Cash Balance (₹ — REQUIRED), optional Valuation Update and Notes
3. Show live runway = `cashBalance / burnRate` updating as user types
4. On submit → `POST /api/startups/:id/updates`
5. Backend: save → compute runway → run alert engine → update `currentValuation` if provided → write audit log
6. Frontend: show MoM comparison row below the new update (Revenue Δ%, runway trend)

### Flow 3: Record Exit
1. Open active startup → `Record Exit`
2. Form: Exit Date, Exit Value (₹), Exit Type
3. Show live preview: estimated final MOIC and XIRR as user types
4. ConfirmDialog: "This will permanently close this investment. This cannot be undone."
5. On confirm → `POST /api/startups/:id/exit`
6. Backend: create Cashflow (positive, type=`exit`) → set `status = exited` → calculate final metrics → write audit log
7. Frontend: startup moves to Exited section, all portfolio metrics update

### Flow 4: Add Follow-On Investment
1. Open active startup → `Add Follow-On`
2. Form: Amount (₹), Date, Round Name, Equity % acquired this round, Valuation at Time (₹)
3. On submit → `POST /api/startups/:id/follow-on`
4. Backend: create Cashflow (negative, type=`follow_on`) → create DilutionEvent → update `currentEquityPercent` → recalculate metrics → write audit log
5. Frontend: dilution history table updates, all metrics recalculate

### Flow 5: Password Reset
1. Click "Forgot password" on login page
2. Enter email → `POST /api/auth/forgot-password`
3. Email sent with hashed token link (1-hour expiry)
4. User clicks link → enter new password → `POST /api/auth/reset-password`
5. Token cleared, all sessions invalidated, redirect to login

---

## PART 10 — SECURITY REQUIREMENTS

Non-negotiable. Implement all of these.

**Authentication**
- Access token: JWT, 15-min expiry, signed with `JWT_SECRET` (minimum 64 random bytes)
- Refresh token: JWT, 7-day expiry — stored **only** in `httpOnly; Secure; SameSite=Strict` cookie
- Never store any token in `localStorage` or `sessionStorage`
- Silent refresh: Axios interceptor auto-calls `/api/auth/refresh` on 401, then retries original request once
- Rate limit auth endpoints: 5 failed attempts per IP per 15 minutes → return 429

**Data integrity**
- All monetary values in MongoDB stored as `Number` (integer paise) — never as string or float with decimals
- Validate that `startupId` belongs to the authenticated `investorId` on every request — prevent cross-investor data access
- Zod validation on every POST/PUT — return `400` with field-level errors on failure
- Unique index enforced: `{ startupId, month }` on MonthlyUpdate collection

**Audit logging**
- Every CREATE, UPDATE, DELETE on financial collections writes to AuditLog before returning response
- Create a middleware function: `auditLog({ investorId, action, entityType, entityId, oldValue, newValue, req })`
- AuditLog is append-only — no route, service, or model function may call `.updateOne()` or `.deleteOne()` on AuditLog

**HTTP security**
- CORS: allow only `FRONTEND_URL` from env variable
- Helmet.js: enable all default headers
- No raw MongoDB query string interpolation — always use Mongoose queries with typed parameters
- All file download URLs must be temporary (15-minute expiry) — never expose the raw `fileKey`

---

## PART 11 — NUMBER FORMATTING

All formatting lives in `frontend/src/utils/formatters.ts`. Never format inline in components.

```typescript
// Compact currency (for metric cards and chart axes)
formatCurrencyCompact(100000000)  →  "₹1.00Cr"     // 1 crore
formatCurrencyCompact(8500000)    →  "₹8.5L"        // 85 lakh
formatCurrencyCompact(50000)      →  "₹50,000"

// Full currency (for tables and detail views)
formatCurrencyFull(100000000)     →  "₹1,00,00,000"

// MOIC
formatMOIC(2.347)    →  "2.35x"
formatMOIC(0.8)      →  "0.80x"
formatMOIC(null)     →  "—"       // Never NaN, never throw

// Percentages (IRR, CAGR, revenue change)
formatPercent(0.247)   →  "+24.7%"
formatPercent(-0.123)  →  "-12.3%"
formatPercent(null)    →  "—"

// Runway
formatRunway(5.3)      →  "5.3 months"
formatRunway(Infinity) →  "No burn"
formatRunway(0)        →  "0 months"

// Note: all inputs assume values are already converted from paise to rupees
// Conversion: rupees = paise / 100
```

---

## PART 12 — DESIGN SYSTEM

**Colour tokens — define in `tailwind.config.js` and as CSS variables**

```css
--color-bg-primary:     #080b12;   /* Page background */
--color-bg-card:        #0d1525;   /* Card background */
--color-bg-sidebar:     #0a0e1a;   /* Sidebar */
--color-border:         #1a2640;   /* Card/table borders */
--color-text-primary:   #e2e8f0;   /* Headings, metric values */
--color-text-secondary: #94a3b8;   /* Labels, sub-text */
--color-text-muted:     #64748b;   /* Placeholders, disabled */
--color-gold:           #c9a84c;   /* Brand, primary buttons, active nav */
--color-gold-light:     #e8c96a;   /* Hover on gold elements */
--color-green:          #22c55e;   /* Positive performance */
--color-yellow:         #f59e0b;   /* Warnings */
--color-red:            #ef4444;   /* Critical alerts, losses */
--color-blue:           #3b82f6;   /* Informational, neutral */
```

**Colour is signal — never decoration. Strict rules:**
- 🟢 Green: MOIC > 1x, positive IRR, revenue up, "all clear"
- 🟡 Yellow: warnings — low runway, revenue drop, overdue update, MOIC below threshold
- 🔴 Red: critical — MOIC < 1x, cash zero, deeply negative IRR
- 🟡 Gold: brand, primary CTAs, active navigation state only

**Typography**
- Display (page title, dashboard heading): `Instrument Serif` from Google Fonts
- UI body (labels, buttons, table text): `Sora` from Google Fonts
- Metric values (MOIC, IRR, ₹ figures): `JetBrains Mono` from Google Fonts

**Component sizing**
- Card padding: `24px`
- Section/card gap: `24px`
- Card border-radius: `14px`
- Button border-radius: `8px`
- Sidebar width: `220px` (collapsed: `72px`)

---

## PART 13 — SEED DATA

Implement in `backend/src/seed.ts`. Run with `npx ts-node src/seed.ts`.
Wipe all collections before seeding (dev only — add a guard for production).

**Demo investor account**
```
Email:    investor@portfolioos.com
Password: Demo@2024
Name:     Arjun Mehta
```

**5 startup investments**

| Startup | Sector | Stage | Invested | Entry Val | Current Val | Status |
|---------|--------|-------|----------|-----------|-------------|--------|
| Finly | FinTech | Series A | ₹50L | ₹80L | ₹2.2Cr | Active |
| HealthNode | HealthTech | Seed | ₹30L | ₹3Cr | ₹95L | Active |
| EduStack | EdTech | Pre-Seed | ₹15L | ₹1.5Cr | ₹1.2Cr | Active (below cost) |
| GreenLoop | CleanTech | Seed | ₹20L | ₹2Cr | Exit: ₹58L | Exited — Acquisition |
| CropMind | AgriTech | Pre-Seed | ₹10L | ₹1Cr | ₹95L | Active |

**Monthly updates** — seed 3 months per active startup. Make HealthNode have low cash balance (< 6 months runway) to trigger a RUNWAY_WARNING alert on seed.

**AlertConfiguration** — create one document for the demo investor with all defaults.

**Documents** — 1–2 document records per startup with placeholder fileKeys (no actual files needed for seed).

---

## PART 14 — ERROR HANDLING

**Standard API response envelope — use for every response**

```typescript
// Success
{ success: true, data: <payload> }

// Error
{
  success: false,
  error: {
    code: string,
    message: string,
    fields?: Record<string, string>   // Field-level validation errors
  }
}
```

**Error codes and HTTP status**

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `UNAUTHORIZED` | 401 | Missing or expired JWT |
| `FORBIDDEN` | 403 | Authenticated but not authorised (e.g. wrong investorId) |
| `NOT_FOUND` | 404 | Document doesn't exist or belongs to another investor |
| `DUPLICATE` | 409 | Unique constraint — e.g. same month update already exists |
| `CALCULATION_ERROR` | 422 | Financial calculation returned null or invalid |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

**Frontend error handling**
- `401` → attempt silent token refresh → if fails, redirect to `/login`
- `404` → show inline empty/not-found state, not a crash page
- `409` → show friendly message: "An update for this month already exists"
- `422` → show `"—"` for the affected metric, never show NaN or an error page
- `500` → toast: "Something went wrong. Please try again."
- Network error → toast: "Unable to connect. Check your internet connection."

---

## PART 15 — OUT OF SCOPE IN V1

Do not build, stub, or partially implement any of these:

- Real-time market data or external valuation feeds
- Multi-currency FX conversion with live rates
- Automated emails from founder update system (manual entry only)
- Founder login portal
- Mobile native app — web-responsive only
- LP access portal
- Subscription billing or payment processing
- Co-investor / syndicate features
- Cap table modelling or pro-forma dilution scenarios
- Push notifications

---

## PART 16 — BUILD ORDER

Follow this sequence. Each phase produces a working, testable system.

```
Phase 1 — Foundation
  1. Monorepo scaffolding (TypeScript, ESLint, Prettier, folder structure)
  2. MongoDB connection setup (db.ts), all Mongoose schemas and indexes
  3. Auth endpoints: login, logout, refresh, forgot-password, reset-password
  4. JWT middleware (auth guard for all protected routes)

Phase 2 — Financial Core
  5. financials.service.ts — all 7 calculation functions
  6. Jest unit tests for every calculation, including all edge cases
  7. analytics.service.ts — getPortfolioAnalytics with in-memory cache

Phase 3 — Core API
  8. Startups CRUD + initial investment cashflow creation
  9. Dashboard endpoint (uses analytics service)
  10. Monthly updates endpoint + alert engine trigger
  11. Alert engine (conditions, deduplication, message templates)
  12. Follow-on investment + dilution event
  13. Exit recording
  14. Document upload/download
  15. Settings + audit log endpoint

Phase 4 — Frontend
  16. Tailwind config + design system tokens
  17. Auth context, login page, protected route wrapper
  18. Primitive UI components (MetricCard, Modal, FormField, etc.)
  19. Dashboard page
  20. Portfolio list + StartupDetailPage
  21. Monthly update form with live runway preview
  22. Alerts page + sidebar badge
  23. Documents vault
  24. Settings page (all tabs)

Phase 5 — Polish & Completion
  25. PDF report generation (portfolio + startup level)
  26. Seed data script
  27. All 6 empty states
  28. Error boundaries, error states, loading skeletons
  29. Audit log viewer in Settings
  30. README with setup instructions (env vars, local run, seed command)
```

---

## PART 17 — DEFINITION OF DONE

The build is complete when every item passes:

**Backend**
- [ ] All 9 Mongoose schemas implemented with correct indexes
- [ ] All financial service functions have Jest unit tests (all edge cases covered)
- [ ] Every financial mutation writes to AuditLog before returning response
- [ ] Alert engine deduplication works — no duplicate unread alerts
- [ ] Password reset flow works end-to-end (token issued, validated, cleared)
- [ ] Rate limiting active on `/api/auth/login`
- [ ] All monetary fields stored as integer `Number` (paise) — no float decimals
- [ ] Cross-investor access impossible — every query scoped to authenticated `investorId`

**Frontend**
- [ ] Dashboard loads under 2 seconds on standard connection
- [ ] All 6 empty states implemented with correct copy and CTAs
- [ ] All metrics show `"—"` on `null` — never `NaN`, `undefined`, or blank
- [ ] Alert count badge on sidebar updates without page reload
- [ ] Responsive layout tested at 375px, 768px, 1280px
- [ ] Runway auto-calculates live as user types in update form
- [ ] ConfirmDialog shown before all destructive actions (exit, delete)

**Security**
- [ ] Refresh token only in httpOnly cookie — zero localStorage token storage
- [ ] CORS restricted to `FRONTEND_URL` env variable only
- [ ] Every protected endpoint returns 401 without a valid JWT
- [ ] AuditLog has no update or delete operations anywhere in codebase

**Data**
- [ ] `npx ts-node src/seed.ts` runs without errors
- [ ] Demo login works: `investor@portfolioos.com` / `Demo@2024`
- [ ] At least one RUNWAY_WARNING alert generated from seed data
- [ ] Settings export returns valid JSON with all investor data

---

*End of PortfolioOS Master Build Prompt — Version 1.1 (MongoDB Edition)*
*Copy this entire document and paste it at the start of your AI coding session.*
*Reference specific Part numbers when working on individual modules.*
