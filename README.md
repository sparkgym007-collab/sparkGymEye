# SPARK GymEye

SPARK GymEye is a gym operations application for desktop and mobile. It is designed for a gym owner, trainers, and members with attendance tracking, membership fees, overdue monitoring, and automatic weekly overdue reports.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Java 21 + Spring Boot
- Database target: Supabase PostgreSQL
- Local database: H2
- Report generation: Apache POI Excel
- Automation: Spring `@Scheduled`
- Notifications: email first, WhatsApp optional later

## Project Structure

```text
SparkGymEye/
  frontend/   React application
  backend/    Spring Boot API
  docs/       Architecture and product notes
```

## Run Frontend

```bash
npm install --prefix frontend
npm run dev --prefix frontend
```

## Build Frontend

```bash
npm run build --prefix frontend
```

## Build Backend

```bash
gradle -p backend classes
```

## Backend Environment

For local development the backend uses H2 automatically. For Supabase PostgreSQL, set:

```text
DATABASE_URL=<postgres-jdbc-url>
DATABASE_USERNAME=<supabase-user>
DATABASE_PASSWORD=<supabase-password>
REPORT_RECIPIENT_EMAIL=owner@example.com
REPORT_CC_EMAIL=trainer@example.com
OVERDUE_REPORT_CRON=0 0 10 ? * THU
```

Email is intentionally the default reporting channel because it can be free and stable. WhatsApp should be added later only after choosing an approved provider.

## Neon Database

Neon PostgreSQL setup is documented in `docs/neon-setup.md`. Use the `neon` Spring profile for the real Neon database:

```bash
gradle -p backend migrateDatabase
```

Then run the backend with:

```text
SPRING_PROFILES_ACTIVE=neon
DATABASE_URL=<neon-postgres-or-jdbc-url>
DATABASE_USERNAME=<database-role>
DATABASE_PASSWORD=<your Neon password>
```

Frontend-on-Vercel deployment notes are in `docs/deployment.md`. Keep Neon credentials only in the backend environment, never in frontend/Vercel browser variables.
