# Vyapaari+ Repository Audit Report

## Scope completed

This pass audited the repository startup path, SQLAlchemy model registration, session lifecycle, API initialization, dependency declarations, timestamp defaults, tests, and README accuracy.

### Changes implemented

- Added `app/db/models.py` as the single model registry for inventory, products, suppliers, purchase orders, and goods receipts.
- Updated application startup and Alembic to register the complete implemented schema before schema creation or migration comparison.
- Fixed `get_db_session()` so it yields a session and always closes it instead of returning a leaked session.
- Added API startup schema initialization.
- Added `APP_HEADLESS` support so CI/API-only environments do not attempt to launch Qt without a display.
- Added missing runtime dependencies: `jsonschema`, `PyJWT`, `cryptography`, and `qrcode[pil]`.
- Replaced deprecated naive `datetime.utcnow` defaults in purchasing and GRN models with timezone-aware UTC timestamps.
- Added startup/model-registry regression tests.
- Updated `.env.example` and `README.md` with verified commands, implementation scope, and known limitations.

## Validation

- `PYTHONPATH=. pytest -q`: **516 passed**
- `python3 -m compileall -q app tests migrations`: passed
- `git diff --check`: passed
- Headless startup with a clean SQLite database: passed
- Registered schema includes branches, products, suppliers, inventory transfers, purchasing, supplier credit, and goods receipts.

## Remaining product scope

The repository still has reserved but incomplete module boundaries for authentication, business setup, billing, customers, employees, finance, reports, AI, and full desktop screens. GST payload generation is validation/integration-ready but does not submit to government portals or generate live IRNs/e-way bills. These limitations are now explicitly documented in `README.md` rather than presented as finished functionality.
