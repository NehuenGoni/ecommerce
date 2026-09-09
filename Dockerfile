FROM node:20-slim

WORKDIR /app

# Copiamos solo los manifests primero para aprovechar la cache de Docker
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json

RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server

RUN npm run build:shared && npm run build:server

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "packages/server/dist/index.js"]
