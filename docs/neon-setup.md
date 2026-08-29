# Neon Database Setup

SPARK GymEye is configured to use Neon PostgreSQL through environment variables.

## Runtime Environment

Use these values when running the backend:

```text
SPRING_PROFILES_ACTIVE=neon
DATABASE_URL=<neon-postgres-or-jdbc-url>
DATABASE_USERNAME=<database-role>
DATABASE_PASSWORD=<your Neon password>
```

The pooler host can be used later for high-concurrency deployments:

```text
<neon-pooler-jdbc-url>
```

## Migration Command

```bash
gradle -p backend migrateDatabase
```

If a deployment fails because Flyway reports a checksum mismatch for an already-applied migration, repair the schema history once:

```bash
gradle -p backend repairDatabase
```

Then run the deployment or migration command again.

The migration creates:

- `app_user`
- `gym_plan`
- `member`
- `attendance`
- `payment`
- `report_settings`
- `generated_report`
- `notice`
- `flyway_schema_history`

## Why Flyway

Flyway keeps the Neon schema versioned. Hibernate is set to `validate` in the Neon profile so the production database is not changed accidentally by entity auto-update.
