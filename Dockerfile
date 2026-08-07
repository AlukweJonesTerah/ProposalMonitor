# Production Dockerfile for Next.js
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json ./

RUN set -e; \
    echo "[prod] Installing dependencies"; \
    if [ -f yarn.lock ]; then \
        yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
        npm ci; \
    elif [ -f pnpm-lock.yaml ]; then \
        corepack enable pnpm && pnpm install --frozen-lockfile; \
    else \
        echo "[prod] No lockfile found; using npm install"; \
        npm install; \
    fi

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN set -e; \
    echo "[prod] Building application"; \
    if [ -f yarn.lock ]; then \
        yarn build; \
    elif [ -f package-lock.json ]; then \
        npm run build; \
    elif [ -f pnpm-lock.yaml ]; then \
        corepack enable pnpm && pnpm run build; \
    else \
        npm run build; \
    fi

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nextjs && adduser --system --uid 1001 nextjs
RUN mkdir -p /app/.next && chown -R nextjs:nextjs /app/.next

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
