# RUNBOOK

## Platform Initialization & Seeding
To initialize the platform with mock data (including a full portfolio, multiple company logins, messages, and updates) for testing and UX evaluation, you can run the backend seed script.
**Warning**: Running this clears the database tables.
```bash
cd backend
npm run seed
```

## Monitoring & Incident Response
* **Error Logging**: The application ships with Winston and Morgan. All API errors and unhandled exceptions are structured and logged directly to standard output. Use your provider (e.g. Render/Vercel) to forward these streams to Datadog or AWS CloudWatch.
* **System Metrics**: Post-launch KPIs (monthly submission rates, response SLAs) are exposed internally via `GET /api/metrics` (Requires `INVESTOR` role).
* **Database Scaling**: Prisma uses connection pooling. If your backend encounters `Timeout` errors fetching connections from Postgres during high load, consider activating PgBouncer via your database provider scaling settings.

## Rollback Plan
If a production deployment causes critical errors:
1. Immediately trigger the **Revert to Previous Commit** functionality within your hosting provider (Vercel/Render).
2. If the deployment involved a Prisma Schema change (`prisma db push`), coordinate database reversion manually before re-deploying the codebase, as Prisma `push` is additive and not strictly tracked by reversible history in this setup (Consider migrating to `prisma migrate` for formal history).
3. Notify active users.
