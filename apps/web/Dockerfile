# ---- PactSafe Web (Next.js 14) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy the app source
COPY . .
# Copy the shared schemas package (relative to the build context which is apps/web,
# but docker-compose sets context to ./apps/web so we need a trick: include
# packages/schemas via a bind at build time. Simpler: we vendor schemas into the
# container by copying from the monorepo build context. See docker-compose note.)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
