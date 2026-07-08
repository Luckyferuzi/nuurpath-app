# NuurPath Travels

NuurPath is a full-stack travel management platform for package discovery, booking requests, consultations, flights, reviews, and admin follow-up. The current product is an inquiry and operations workflow, not an online payment system.

## Project Structure

- `client/` - React frontend
- `server/` - Express + Prisma backend
- `server/server.js` - active backend entrypoint
- `server/prisma/schema.prisma` - canonical Prisma schema
- `server/config/env.js` - canonical backend env loader and production validation

## Production Domains

- Frontend: `https://nuurpath.com`
- Frontend alias: `https://www.nuurpath.com`
- Backend: `https://api.nuurpath.com`
- Frontend API env: `REACT_APP_API_URL=https://api.nuurpath.com/api`

The backend does not serve `client/build/` in production. Frontend and backend should be deployed separately.

## Environment Files

- Root orchestration example: `.env.example`
- Backend example: `server/.env.example`
- Frontend example: `client/.env.example`

Do not commit real secrets. Keep production values in your host platform or private `.env` files only.

### Backend production variables

- `NODE_ENV=production`
- `PORT=5001`
- `CLIENT_URL=https://nuurpath.com`
- `API_BASE_URL=https://api.nuurpath.com`
- `ALLOWED_ORIGINS=https://nuurpath.com,https://www.nuurpath.com`
- `UPLOAD_ROOT=/var/data/nuurpath/uploads`
- `DATABASE_URL=<real-value>`
- `JWT_SECRET=<strong-real-value>`
- `EMAIL_HOST=<smtp-host>`
- `EMAIL_PORT=<smtp-port>`
- `EMAIL_USER=<smtp-user>`
- `EMAIL_PASS=<smtp-password>`
- `EMAIL_FROM=<from-address>`
- `ADMIN_EMAIL=<admin-inbox>`
- `GOOGLE_CLIENT_ID=<google-oauth-client-id>`

### Frontend production variables

- `REACT_APP_API_URL=https://api.nuurpath.com/api`
- `REACT_APP_GOOGLE_CLIENT_ID=<google-oauth-client-id>`

## Local Development

1. Copy example env files and fill in local values.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

2. Start the backend.

```bash
cd server
npm ci
npm start
```

3. Start the frontend in another terminal.

```bash
cd client
npm ci
npm start
```

4. Optional root helper for parallel local work.

```bash
npm ci
npm run dev
```

## Prisma Commands

Run Prisma commands from `server/` so they use `server/prisma/schema.prisma`.

```bash
cd server
npx prisma generate --schema=prisma/schema.prisma
npx prisma migrate deploy --schema=prisma/schema.prisma
```

For local schema iteration only:

```bash
cd server
npx prisma migrate dev --schema=prisma/schema.prisma
```

Do not use `prisma migrate reset` in deployment flows.

## Docker

The included `Dockerfile` builds the frontend as a validation step and packages the backend runtime separately. The runtime container starts the API from `server/server.js`; it does not serve the React build.

For local container deployment:

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

Set real values in `.env` before deploying. The compose file uses environment interpolation instead of hardcoded secrets.

## Render Deployment

### Backend

- Service name: `nuurpath-app`
- Type: `Web Service`
- Root directory: `server`
- Build command: `npm ci && npx prisma generate --schema=prisma/schema.prisma && npx prisma migrate deploy`
- Start command: `npm start`
- Health check path: `/health`
- Custom domain: `https://api.nuurpath.com`
- Auto deploy: `Off`
- Persistent disk: required while uploads remain on the filesystem
- Disk mount path: `/var/data/nuurpath`
- Required upload env: `UPLOAD_ROOT=/var/data/nuurpath/uploads`

### Frontend

- Service name: `nuurpath-web`
- Type: `Static Site`
- Root directory: `client`
- Build command: `npm ci && npm run build`
- Publish directory: `build`
- Custom domains: `https://nuurpath.com` and `https://www.nuurpath.com`
- Auto deploy: `Off` during backend phase
- Required env: `REACT_APP_API_URL=https://api.nuurpath.com/api`

## Storage Notes

- Local development falls back to `server/public/uploads/` and `server/private/uploads/`.
- Production filesystem uploads should use `UPLOAD_ROOT=/var/data/nuurpath/uploads`.
- Public assets are served from `${UPLOAD_ROOT}/public`.
- Protected booking documents are stored under `${UPLOAD_ROOT}/private` and remain behind authenticated API access.

## Repository Hygiene

- Do not commit `client/build/`
- Do not commit `server/public/uploads/`
- Do not commit `server/private/uploads/`
- Do not commit `.env` files or other real secrets
