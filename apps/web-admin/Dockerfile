FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/web-admin/package.json apps/web-admin/
RUN pnpm install --no-frozen-lockfile --filter web-admin
COPY apps/web-admin apps/web-admin
RUN pnpm --filter web-admin build

FROM nginx:alpine
COPY --from=builder /app/apps/web-admin/dist /usr/share/nginx/html
COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
