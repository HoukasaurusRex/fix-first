# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /workspace

# Copy root-level package files for workspace resolution
COPY package.json yarn.lock ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/
COPY apps/api/tsconfig.app.json apps/api/
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/prisma.config.ts apps/api/

# Install all dependencies (including devDeps needed for tsc)
RUN yarn install --frozen-lockfile

# Copy source and build
COPY apps/api/src/ apps/api/src/

WORKDIR /workspace/apps/api
RUN yarn db:generate && yarn build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace root for package resolution
COPY --from=builder /workspace/package.json /workspace/yarn.lock ./
COPY --from=builder /workspace/packages/ packages/

# Copy API package manifest and install production deps only
COPY --from=builder /workspace/apps/api/package.json ./apps/api/
RUN yarn install --frozen-lockfile --production --ignore-scripts

# Copy compiled output and Prisma artefacts
COPY --from=builder /workspace/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /workspace/apps/api/src/generated/ ./apps/api/src/generated/
COPY --from=builder /workspace/apps/api/prisma/ ./apps/api/prisma/

WORKDIR /app/apps/api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
