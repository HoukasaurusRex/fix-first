# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /workspace

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy root workspace files
COPY package.json yarn.lock ./
COPY packages/ packages/
COPY apps/web/package.json apps/web/
COPY apps/web/next.config.ts apps/web/
COPY apps/web/tsconfig.json apps/web/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source and build
COPY apps/web/src/ apps/web/src/
COPY apps/web/public/ apps/web/public/ 2>/dev/null || true

WORKDIR /workspace/apps/web
RUN yarn build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone server and static assets produced by Next.js
COPY --from=builder /workspace/apps/web/.next/standalone ./
COPY --from=builder /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /workspace/apps/web/public ./apps/web/public 2>/dev/null || true

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
