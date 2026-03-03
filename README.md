# FixFirst

[![Deploy — Production](https://github.com/HoukasaurusRex/fix-first/actions/workflows/deploy-prod.yml/badge.svg)](https://github.com/HoukasaurusRex/fix-first/actions/workflows/deploy-prod.yml)

> **Repair before you replace.**

FixFirst is an open, consumer-empowerment platform for tracking product warranties, uploading purchase receipts, and accessing product manuals — all in one place.

The tool scans receipts and warranty documents using OCR to extract key details (purchase date, retailer, product model, warranty terms) and stores them securely. Product manuals and warranty documents are deduplicated globally so the same PDF is never stored twice for the same model.

Primary jurisdiction: **Canada** (provincial and federal consumer protection law). The architecture is designed to accommodate additional countries over time.

---

## Why this exists

Consumers routinely lose track of warranties, discard receipts, or simply don't know what their rights are. In Canada, statutory warranty protections exist independent of any manufacturer guarantee — most people never use them. Meanwhile, products that could be repaired or replaced under warranty get thrown away prematurely, contributing to unnecessary waste.

This tool aims to:

- Make it easy to log and retrieve warranty information for every product you own
- Surface the statutory rights you have as a Canadian consumer, beyond what the manufacturer advertises
- Encourage repair and replacement under warranty before buying new
- Provide a global, deduplicated library of product manuals and warranty documents

---

## Tech stack

| Layer             | Technology                                              |
| ----------------- | ------------------------------------------------------- |
| Monorepo          | Yarn Workspaces                                         |
| Language          | TypeScript 5 (`tsc` for compilation)                    |
| API server        | NestJS (Express platform adapter)                       |
| Web frontend      | Next.js 15 (App Router, React 19)                       |
| Database          | PostgreSQL 15+ (docker-compose locally)                 |
| ORM               | Prisma                                                  |
| Auth              | JWT (access + refresh tokens, `jsonwebtoken`)           |
| Object storage    | AWS S3 (SDK v3)                                         |
| OCR               | Tesseract.js                                            |
| Testing           | Node built-in test runner (`node:test`)                 |
| Infrastructure    | AWS CDK (`apps/infra`)                                  |
| CI/CD             | GitHub Actions                                          |
| Local deps        | docker-compose (PostgreSQL, MailHog for email preview)  |
| Linting           | ESLint 9 (flat config) + typescript-eslint              |
| Formatting        | Prettier                                                |

---

## Monorepo structure

```text
fix-first/
├── apps/
│   ├── api/            # NestJS REST API
│   ├── web/            # Next.js 15 frontend
│   └── infra/          # AWS CDK infrastructure app
├── packages/
│   └── shared-types/   # Shared TypeScript interfaces
├── docker-compose.yml  # Local: PostgreSQL 15, MailHog
├── tsconfig.base.json
├── eslint.config.mjs
└── package.json        # Yarn workspaces root
```

---

## Features

### Receipt scanning

- Upload a photo or PDF of a purchase receipt
- OCR (Tesseract.js) extracts: purchase date, retailer, product name/model, price, and payment method
- Extracted data is editable before saving; English and French language packs included

### Warranty tracking

- Log manufacturer warranties with start date, duration, and coverage type
- Automatic expiry alerts via email (configurable days-before threshold)
- Warranty types: manufacturer, statutory (Canadian consumer law), extended/third-party, lifetime

### Product manuals & warranty documents

- Upload or link product manuals and warranty PDFs
- Global deduplication by SHA-256 content hash: one copy shared across all users who own the same model
- Community library — if someone else already uploaded the manual for your product, you benefit automatically

### Canadian consumer law context

- For each product category, surface the applicable statutory warranty rights under provincial and federal law
- All 13 provinces/territories + federal jurisdiction seeded with plain-language summaries
- "This is not legal advice" — summaries are for awareness only

### Consumer empowerment

- "Before you buy new" checklist: verify warranty status before replacing a product
- Repair vs. replace guidance based on product age and warranty status
- Links to manufacturer service centres and right-to-repair resources

---

## Warranty types

| Type             | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| Manufacturer     | Provided by the brand; varies by product and territory                      |
| Statutory        | Implied by law (Canada); cannot be waived; covers fitness for purpose       |
| Extended         | Sold separately (e.g., store warranty plans); check exclusions carefully    |
| Lifetime         | Tied to the original purchaser; read the fine print — "lifetime" varies     |

---

## Prerequisites

- **Node.js** >= 20
- **Yarn** >= 1.22
- **Docker** (for docker-compose local services)
- **AWS account** (for S3 in production; local dev uses env vars pointing at any S3-compatible service)

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/HoukasaurusRex/fix-first.git
cd fix-first
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Start local services

```bash
yarn db:up
# Starts PostgreSQL 15 on :5432 and MailHog on :1025 (SMTP) / :8025 (web UI)
```

### 4. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Key variables (see each `.env.example` for the full list):

| Variable             | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                           |
| `JWT_ACCESS_SECRET`  | Secret for signing access tokens (15 min lifetime)     |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (30 day lifetime)    |
| `AWS_S3_BUCKET`      | S3 bucket name for receipt and document storage        |
| `AWS_REGION`         | AWS region                                             |
| `SMTP_HOST`          | SMTP host (`localhost` for MailHog, SES host in prod)  |
| `SMTP_PORT`          | SMTP port (`1025` for MailHog, `587` for SES)          |

### 5. Run database migrations

```bash
yarn workspace @fixfirst/api db:migrate
```

### 6. Start development servers

```bash
# Both API and web concurrently
yarn dev

# API only (port 3001)
yarn dev:api

# Web frontend only (port 3000)
yarn dev:web
```

---

## Workspace commands

```bash
# Build all packages
yarn build

# Run tests across all packages
yarn test

# Lint all packages
yarn lint

# Format code
yarn format
yarn format:check

# Run a command in a specific workspace
yarn workspace @fixfirst/api <script>
yarn workspace @fixfirst/web <script>
yarn workspace @fixfirst/infra <script>
```

### API database commands

```bash
yarn workspace @fixfirst/api db:migrate   # Run Prisma migrations
yarn workspace @fixfirst/api db:generate  # Regenerate Prisma client (run after schema changes)
yarn workspace @fixfirst/api db:seed      # Seed jurisdictions and consumer law data
yarn workspace @fixfirst/api db:studio    # Open Prisma Studio (database GUI)
```

---

## Design decisions

### NestJS with Express adapter

NestJS provides a structured module system, built-in dependency injection, decorator-based routing, and first-class support for Guards (auth), Interceptors, and Pipes. The default `@nestjs/platform-express` adapter is used: it has the broadest middleware ecosystem compatibility and works out of the box with `helmet`, `cookie-parser`, and `multer`.

### Prisma ORM

Prisma provides type-safe database access, a migration workflow (`prisma migrate`), and an auto-generated client that matches the schema exactly. The `schema.prisma` file is the single source of truth for data shape.

### Node built-in test runner

`node:test` (stable in Node 20) avoids a Jest/Vitest dependency. Test files use `tsx` as the TypeScript loader: `node --import tsx/esm --test 'src/**/*.test.ts'`.

### JWT auth pattern

- **Access token**: short-lived (15 min), sent in `Authorization: Bearer` header
- **Refresh token**: long-lived (30 days), stored hashed in the database (`refresh_tokens` table), sent as an `httpOnly; Secure; SameSite=Strict` cookie
- Rotation: each refresh issues a new refresh token and invalidates the old one

### S3 object storage

All uploaded files are stored in a single S3 bucket with content-addressed keys (SHA-256 hash):

```text
receipts/{userId}/{sha256}.{ext}
documents/global/{sha256}.{ext}
```

This ensures global deduplication for product manuals — identical files are stored once regardless of how many users upload them.

### AWS CDK for infrastructure

All cloud resources are defined as code in `apps/infra`. Staging and production are separate CDK stacks sharing the same constructs. Secrets are in AWS Secrets Manager; no secrets in source code.

### GitHub Actions CI/CD

- Every PR: lint → build → test (with PostgreSQL service container)
- Merge to `main`: auto-deploy to production (with manual approval gate)

---

## Database schema

Core entities:

- `users` — registered consumers
- `refresh_tokens` — hashed refresh tokens with expiry and revocation tracking
- `products` — unique product models (global, shared across all users)
- `user_products` — a user's owned instance of a product model
- `warranties` — warranty records linked to a user_product
- `receipts` — scanned purchase receipts with OCR status and extracted fields
- `documents` — manuals/warranty PDFs (global, deduplicated by SHA-256)
- `jurisdictions` — Canadian provinces/territories with consumer law metadata
- `jurisdiction_laws` — plain-language summaries of applicable statutes
- `notification_prefs` — per-user email alert configuration

---

## MailHog (local email preview)

MailHog is a local SMTP server that captures all outbound email at `localhost:1025` and displays it in a browser inbox at `http://localhost:8025`. During development, warranty expiry alert emails are sent to MailHog instead of real inboxes — no AWS SES credentials required.

In production, `SMTP_HOST`/`SMTP_PORT` env vars point at AWS SES instead.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large pull request so we can discuss the approach.

---

## License

[PolyForm Shield 1.0.0](./LICENSE) — you may view, fork, and contribute to this project, but you may not use it to build a competing product or service.
