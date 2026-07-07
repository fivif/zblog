FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web-public/package.json apps/web-public/
RUN pnpm install --no-frozen-lockfile --filter web-public

FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm --filter web-public build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web-public/public ./public
COPY --from=builder /app/apps/web-public/.next/standalone ./
COPY --from=builder /app/apps/web-public/.next/static ./apps/web-public/.next/static

EXPOSE 3000
CMD ["node", "apps/web-public/server.js"]
