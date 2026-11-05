FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BRAND=mahoje
ENV NEXT_PUBLIC_BRAND=$NEXT_PUBLIC_BRAND
# Public tokens are baked into the client bundle at build time (see docs/tokens.md).
# Empty means: use the fallback in the source.
ARG NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN=
ARG NEXT_PUBLIC_ADRESSEVAELGER_TOKEN=
ENV NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN=$NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN
ENV NEXT_PUBLIC_ADRESSEVAELGER_TOKEN=$NEXT_PUBLIC_ADRESSEVAELGER_TOKEN
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
