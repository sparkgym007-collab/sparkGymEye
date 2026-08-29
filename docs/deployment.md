# Deployment Notes

## Backend and Neon

The Spring Boot backend connects to Neon through environment variables. Do not commit a real database URL or password.

Required backend environment variables:

```text
SPRING_PROFILES_ACTIVE=neon
DATABASE_URL=<neon-postgres-or-jdbc-url>
DATABASE_USERNAME=<database-role>
DATABASE_PASSWORD=<database-password>
```

The backend can be deployed to a Java-friendly host such as Render, Railway, Fly.io, an AWS service, or a VPS. As long as those environment variables are configured on the backend host, the backend will keep using Neon regardless of where the frontend is hosted.

The backend accepts Neon URLs in either `postgresql` URL form or JDBC form through `DATABASE_URL`.

If Render fails with a Flyway checksum mismatch after an already-applied migration file changed, run this once from the backend service shell:

```bash
gradle -p backend repairDatabase
```

If you cannot open a backend service shell on Render, set `SPARK_FLYWAY_REPAIR_ON_STARTUP=true` for one deploy instead. After that deploy starts successfully, remove the variable and redeploy normally.

Keep Flyway validation enabled so future migration drift still fails loudly.

For Docker-based backend deployment, use:

```text
Root Directory: backend
Dockerfile Path: Dockerfile
Compute Plan: Free
```

Do not put backend database variables into the Vercel frontend project. Put them only in the Java backend service environment.

## Frontend on Vercel

Vercel should host the React frontend only. The frontend should call the deployed backend API URL.

Recommended frontend environment variable:

```text
VITE_API_BASE_URL=<deployed-backend-url>
```

Do not put Neon credentials in Vercel frontend variables. Browser code is public to users, so database credentials must remain only on the backend server.

## Local Development

Local backend development can continue using H2 by default. Use the `neon` profile only when you want the local backend to connect to Neon.
