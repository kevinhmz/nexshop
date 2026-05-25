# Stage 1: Base
FROM node:22-alpine AS base

ENV PNPM_HOME=/usr/local/bin

RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod=false


# Stage 3: Build
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run prisma:generate
RUN pnpm build:prod
RUN pnpm prune --prod

# Stage 4: Production
FROM node:22-alpine AS production

RUN apk add --no-cache dumb-init openssl

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts

USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]