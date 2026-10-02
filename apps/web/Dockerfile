# AVA web — Next.js standalone build (non-root)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
# Rewrites are resolved at build time; in Compose the proxy also routes /api directly.
ARG API_INTERNAL_URL=http://api:8000
ENV NEXT_TELEMETRY_DISABLED=1 API_INTERNAL_URL=${API_INTERNAL_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S ava && adduser -S -G ava -u 10001 ava
COPY --from=build --chown=ava:ava /app/.next/standalone ./
COPY --from=build --chown=ava:ava /app/.next/static ./.next/static
USER ava
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "server.js"]
