# Warranty Tool

> **Know what you own. Know your rights. Repair before you replace.**

Warranty Tool is an open, consumer-empowerment platform for tracking product warranties, uploading purchase receipts, and accessing product manuals — all in one place.

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

## Monorepo structure

```text
warranty-tool/
├── apps/
│   ├── api/            # Fastify REST API (Node.js + TypeScript)
│   └── web/            # Next.js consumer frontend (React + TypeScript)
├── packages/
│   └── shared-types/   # Shared TypeScript interfaces used across apps
├── tsconfig.base.json  # Root TypeScript config (extended by all apps/packages)
├── eslint.config.mjs   # Workspace-wide ESLint (flat config)
└── package.json        # Yarn workspaces root
```

---

## Tech stack

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Monorepo        | [Yarn Workspaces](https://yarnpkg.com)                  |
| Language        | TypeScript 5                                            |
| API server      | [Fastify](https://fastify.dev) (Node.js)                |
| Web frontend    | [Next.js 15](https://nextjs.org) (App Router)           |
| Database        | PostgreSQL                                              |
| Object storage  | S3-compatible (AWS S3 / self-hosted via MinIO)          |
| OCR             | TBD (Tesseract, AWS Textract, or Google Document AI)    |
| Auth            | TBD (JWT / OAuth2)                                      |
| Linting         | ESLint 9 (flat config) + typescript-eslint              |
| Formatting      | Prettier                                                |

---

## Planned features

### Receipt scanning

- Upload a photo or PDF of a purchase receipt
- OCR extracts: purchase date, retailer, product name/model, price, and payment method
- Extracted data is editable before saving

### Warranty tracking

- Log manufacturer warranties with start date, duration, and coverage type
- Automatic expiry alerts (configurable)
- Warranty types: manufacturer, statutory (Canadian consumer law), extended/third-party, lifetime

### Product manuals & warranty documents

- Upload or link product manuals and warranty PDFs
- Global deduplication by product model: one copy shared across all users who own the same model
- Serves as a community library — if someone else already uploaded the manual for your vacuum, you benefit automatically

### Canadian consumer law context

- For each product category, surface the applicable statutory warranty rights under:
  - Federal: *Competition Act*, *Consumer Packaging and Labelling Act*
  - Provincial: e.g., Ontario's *Consumer Protection Act*, BC's *Sale of Goods Act*, Quebec's *Consumer Protection Act* (the strongest in Canada)
- Plain-language summaries, not legal advice

### Consumer empowerment

- "Before you buy" checklist: check if your broken product is under warranty first
- Repair vs. replace guidance based on product age and warranty status
- Links to manufacturer service centres and right-to-repair resources

---

## Warranty types (reference)

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
- **PostgreSQL** >= 15
- An S3-compatible bucket (AWS S3, MinIO, Cloudflare R2, etc.)

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/[your-org]/warranty-tool.git
cd warranty-tool
```

### 2. Install dependencies

Yarn workspaces installs all dependencies for every package in a single step:

```bash
yarn install
```

### 3. Configure environment variables

Copy the example env files and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Key variables (see each `.env.example` for the full list):

| Variable           | Description                                    |
| ------------------ | ---------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string                   |
| `S3_BUCKET`        | S3 bucket name for document storage            |
| `S3_REGION`        | S3 region (or endpoint URL for MinIO/R2)       |
| `JWT_SECRET`       | Secret for signing authentication tokens       |

### 4. Start development servers

```bash
# API server only
yarn dev:api

# Web frontend only
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

# Run a command in a specific workspace
yarn workspace @warranty-tool/api <script>
yarn workspace @warranty-tool/web <script>
```

---

## Database

PostgreSQL is the primary data store. Migrations will be managed with a migration tool (TBD: Drizzle ORM, Prisma, or node-pg-migrate).

Core entities (planned):

- `users` — registered consumers
- `products` — unique product models (global, shared)
- `user_products` — a user's owned instances of a product
- `warranties` — warranty records linked to a user_product
- `receipts` — scanned purchase receipts
- `documents` — manuals, warranty PDFs (global, deduplicated by model)
- `jurisdictions` — countries and provinces with consumer law metadata

---

## Object storage

All uploaded files (receipts, manuals, warranty documents) are stored in S3-compatible object storage.

Documents are keyed by a content hash (SHA-256) so identical files are stored only once, regardless of how many users upload the same product manual.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large pull request so we can discuss the approach.

---

## License

MIT
