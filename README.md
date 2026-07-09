# NuurPath Travels

NuurPath is a travel request and operations platform for Umrah packages, flights, visa/passport support, service inquiries, consultations, and customer follow-up. The website starts the request. The team continues the real operational work on WhatsApp and through internal follow-up.

## What It Is

- Guest-first request platform for package, flight, service, consultation, and contact inquiries
- Optional customer account system for tracking requests and receiving account-based benefits
- Admin and manager operations dashboard for request triage, pipeline updates, and internal notes
- Travel lead pipeline, not a checkout flow

## What It Is Not

- Not an online payment gateway
- Not a live flight inventory engine
- Not an instant ticketing system
- Not a Galileo integration
- Not a visa or passport approval guarantee

Flights remain manual and team-assisted. Package and service requests remain inquiry-based. Customer follow-up continues on WhatsApp.

## Role Model

- `user`: customer account created through public registration or Google sign-in
- `manager`: operational follow-up role created by an admin
- `admin`: full operational and user-management role

Important rules:

- Public registration always creates `user` accounts only
- Managers do not self-register
- Managers cannot manage users or roles
- Admins create manager accounts
- The last admin cannot be deleted or demoted

## Main Flows

### Public / Guest

- Browse packages and services without logging in
- Submit package requests without mandatory registration
- Submit flight requests without mandatory registration
- Submit visa/passport/service inquiries without mandatory registration
- Submit consultation and contact requests without mandatory registration
- Continue with the team on WhatsApp after submission

### Logged-in Users

- Log in with email/password
- Optionally use Google sign-in when configured
- Submit the same request flows while linking records to their account
- View their own protected request history where supported
- Update their own profile and password

### Admin / Manager

- View operational pipelines for package requests, flight requests, service inquiries, and consultations
- Update pipeline status and internal notes
- Continue lead follow-up through WhatsApp
- Admin-only management for users, managers, services, and package content

## Repository Structure

- `client/`: React frontend
- `server/`: Express + Prisma backend
- `server/server.js`: backend entrypoint
- `server/prisma/schema.prisma`: canonical database schema
- `nuurpath_postman_collection.json`: lightweight API request collection

## Key API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/staff/login`
- `GET /api/auth/admin-setup/status`
- `POST /api/auth/admin-setup/register`
- `POST /api/auth/google`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `POST /api/auth/verify-email`
- `GET /api/auth/me`

### Public Request Creation

- `POST /api/bookings`
- `POST /api/flights`
- `POST /api/services/inquiries`
- `POST /api/appointments/private`
- `POST /api/contact`

### Admin / Manager Operations

- `GET /api/package-bookings`
- `PUT /api/package-bookings/:id`
- `GET /api/flights`
- `PUT /api/flights/:id`
- `GET /api/services/inquiries`
- `PUT /api/services/inquiries/:id`
- `GET /api/appointments/private`
- `PUT /api/appointments/private/:id`

### Admin User Management

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

### Profile / Notifications

- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/change-password`
- `GET /api/notifications`
- `PUT /api/notifications/read-all`

### Media Delivery

- `GET /api/media/public/:id`
- `GET /api/bookings/documents/:id`
- `GET /api/chat/files/:id`

## Environment Configuration

Example files:

- Root orchestration example: `.env.example`
- Backend example: `server/.env.example`
- Frontend example: `client/.env.example`

Do not commit real secrets. Keep production values in your hosting platform or private local env files.

### Backend variables

Core:

- `NODE_ENV`
- `PORT`
- `CLIENT_URL`
- `API_BASE_URL`
- `ALLOWED_ORIGINS`
- `DATABASE_URL`
- `JWT_SECRET`

Optional integrations:

- `GOOGLE_CLIENT_ID`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `ADMIN_EMAIL`

Bootstrap / local helpers:

- `ADMIN_SETUP_TOKEN`
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `DEMO_USER_EMAIL`
- `DEMO_USER_PASSWORD`
- `TEST_LOGIN_EMAIL`
- `TEST_LOGIN_PASSWORD`

Production notes:

- Use a strong `JWT_SECRET` with at least 32 characters
- `ALLOWED_ORIGINS` must list the deployed frontend domains
- `CLIENT_URL` and `API_BASE_URL` should be `https://` in production
- Set `ADMIN_SETUP_TOKEN` to a strong random secret before the first admin uses `/staff/setup`
- Media uploads are stored in Neon through the `StoredFile` table, so Render does not need a Persistent Disk for package images, profile photos, review media, booking documents, or protected chat images
- `UPLOAD_ROOT` is now optional and only exists as a legacy fallback for historical self-hosted filesystem uploads
- Email settings should be configured together if email sending is enabled
- Private booking documents and protected chat files are served through authenticated API routes instead of public static storage

### Frontend variables

- `REACT_APP_API_URL=http://localhost:5000/api`
- `REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here`
- `REACT_APP_WHATSAPP_NUMBER=255764770939`

`REACT_APP_WHATSAPP_NUMBER` is public configuration, not a secret.

## Local Development

1. Copy env examples and fill local values.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

2. Install dependencies.

```bash
npm install
cd server && npm install
cd ../client && npm install
```

3. Start the backend.

```bash
cd server
npm run dev
```

4. Start the frontend in another terminal.

```bash
cd client
npm start
```

5. Optional root helper.

```bash
npm run dev
```

## Database and Prisma

Run Prisma commands from `server/`.

```bash
cd server
npx prisma generate
npx prisma validate
```

Local development migration flow only:

```bash
cd server
npx prisma migrate dev
```

Do not use destructive reset flows against real data. Back up production before applying migrations.

Recent additive migrations from the latest work:

- `202607090001_add_verification_token_expiry`
- `20260709103000_allow_guest_package_requests`
- `20260709143000_add_service_inquiries`
- `20260709173000_add_operational_pipeline_fields`
- `20260709193000_add_stored_files`

## Testing and QA

Backend regression tests:

```bash
cd server
npm test -- --runInBand
```

Backend syntax verification:

```bash
cd server
npm run check
```

Prisma verification:

```bash
cd server
npm run prisma:validate
npx prisma generate
```

Frontend production build:

```bash
cd client
npm run build
```

Current automated backend coverage focuses on:

- public registration role safety
- customer and staff login separation
- one-time first-admin bootstrap protection
- generic forgot-password responses
- hashed password reset token storage
- Google sign-in role safety
- guest package, flight, and service inquiry flows
- admin and manager permission enforcement
- operational status and internal note regression checks
- upload type validation helper behavior
- stored file reference parsing for Neon-backed media

## Storage and Privacy Notes

- New package images, profile photos, review media, booking documents, and protected chat images are stored directly in Neon inside the `StoredFile` table
- Public media is served through `GET /api/media/public/:id`
- Private booking documents remain protected behind `GET /api/bookings/documents/:id`
- Protected chat images remain behind authenticated `GET /api/chat/files/:id` access
- Legacy `/uploads/...` paths can still be served for historical local files, but new uploads no longer depend on Render disk storage

## Postman Collection

`nuurpath_postman_collection.json` is a lightweight helper collection for local QA. It now points at the current local API base URL and the main request flows, but it is not a full contract test suite.

## Operational Notes

- The first admin should be created through the hidden `/staff/setup` route while the database still has zero admins
- After the first admin exists, staff sign-in moves to `/staff/login` and the setup route closes permanently
- Admin should create manager accounts directly
- Managers should use the same `/staff/login` page after an admin creates their account and shares credentials
- Managers should handle follow-up, status updates, and internal notes only
- No online payment is collected on the website
- No live Galileo ticketing or flight booking is exposed to customers
- WhatsApp numbers and production SMTP settings should be tested before launch

## Deployment Reminders

- Deploy frontend and backend separately
- Keep CORS origins aligned with the real frontend domains
- Apply the latest Prisma migration so the `StoredFile` table exists in Neon
- Render no longer needs a Persistent Disk for application uploads
- For the live Render frontend, add a Rewrite rule from `/*` to `/index.html` under Redirects/Rewrites so direct links and browser refreshes work for React routes like `/staff/setup`, `/staff/login`, `/packages/:id`, and `/dashboard`
- `render.yaml` now keeps that same SPA rewrite in the repo for future Blueprint-managed Render deployments
- The frontend now includes a catch-all React route, so truly invalid URLs show a friendly fallback page instead of a blank screen
- No extra environment variables are required for this routing fix
- Back up the database before production migrations
- Test email delivery, Google OAuth, and WhatsApp links in the live environment
