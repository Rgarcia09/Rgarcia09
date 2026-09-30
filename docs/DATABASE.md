# Database Operations

Schema reference: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Migrations

The schema changes **only** through Alembic migrations in `apps/api/alembic/versions`.

```bash
cd apps/api
export DATABASE_URL=postgresql+psycopg://ava:...@localhost:5432/ava_dev
alembic upgrade head                                  # apply
alembic revision --autogenerate -m "describe change"  # create; then review by hand
alembic downgrade -1                                  # development only
```

In Docker, the API container runs `alembic upgrade head` at start-up
(`RUN_MIGRATIONS=true`). Migrations are transactional; a failed migration leaves the
database unchanged and the API does not start.

The test `test_migrations_match_models` fails if models and migrations diverge.

## Databases per environment

| Environment | Database | Notes |
|---|---|---|
| production | `ava` in the Compose `db` service | never used by tests or development |
| development | `ava_dev` | `docker-compose.dev.yml` or a local PostgreSQL |
| test | `ava_test` (`TEST_DATABASE_URL`) | dropped and rebuilt from migrations on every test run |

## Conventions
* UUID primary keys; `created_at`/`updated_at` on mutable records.
* Enumerations as `text` + `CHECK` constraints (easy to extend in a migration).
* Soft retention: projects are archived, users deactivated; history rows are not deleted.
* No large JSON blobs for domain data — `jsonb` only for audit detail, settings,
  integration config, job stats and message sources.

## Access
The database is on the internal Compose network only and is not published to the LAN.
For maintenance: `docker compose exec db psql -U ava -d ava`.
