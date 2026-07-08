FROM node:18-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/public ./public
COPY client/src ./src
COPY client/postcss.config.js ./
COPY client/tailwind.config.cjs ./

ARG REACT_APP_API_URL=https://api.nuurpath.com/api
ARG REACT_APP_GOOGLE_CLIENT_ID=

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

RUN npm run build

FROM node:18-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/config ./config
COPY server/controllers ./controllers
COPY server/middleware ./middleware
COPY server/prisma ./prisma
COPY server/routes ./routes
COPY server/utils ./utils
COPY server/check-db.js ./
COPY server/create-admin.js ./
COPY server/create-package-table.js ./
COPY server/db.js ./
COPY server/fix-env.js ./
COPY server/mainRoutes.js ./
COPY server/restart-db.sh ./
COPY server/seed-packages.js ./
COPY server/seed-services.js ./
COPY server/seed.js ./
COPY server/seedPackages.js ./
COPY server/server.js ./
COPY server/settings.json ./
COPY server/test-endpoints.js ./
COPY server/test-login.js ./
COPY server/verify-admin.js ./
COPY server/verify-table.js ./

RUN npx prisma generate --schema=prisma/schema.prisma \
    && npm prune --omit=dev

FROM node:18-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --from=server-builder /app/server ./server

WORKDIR /app/server

EXPOSE 5001

CMD ["node", "server.js"]
