# Ostras Rewards

A product expiry verification and rewards platform built with Next.js, Express and MongoDB. Members submit product photos, follow verification decisions and track their points. Administrators review unclear dates. OpenAI reads expiry dates and an optional n8n workflow compares dates before calling the API to award points.

[Architecture](docs/architecture.md) · [API reference](docs/api.md) · [Deployment](docs/deployment.md) · [Contributing](CONTRIBUTING.md)

## Product capabilities

- Member registration, sign-in and sign-out with HTTP-only session cookies and role-based API access.
- Responsive member dashboard with points, submission totals, pending checks and recent activity.
- JPG, PNG and WEBP uploads with file-size limits, actual image decoding and a 40-megapixel limit.
- Exact-file duplicate protection per member using a SHA-256 fingerprint and a unique database index.
- Optional MongoDB GridFS photo storage for persistent uploads on ephemeral hosts.
- Private photo delivery: only the uploader and administrators can retrieve an image.
- Optional OpenAI expiry reading and authenticated n8n callbacks; unavailable integrations fall back to manual review.
- Paginated submission history and admin queue with status filters.
- Admin approval/rejection, custom award amounts, review notes and reviewer timestamps.
- Member reward ledger with paginated point history.
- Transactional reward decisions: concurrent approvals and callback retries cannot award a submission twice.
- Request IDs, structured API errors, login/upload rate limits, origin checks, liveness and database readiness endpoints.
- npm workspaces, a reproducible lockfile, formatting, automated tests and GitHub Actions checks.

## Stack

| Layer                 | Technology                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| Web                   | Next.js App Router, React, JavaScript, CSS                                             |
| API                   | Node.js, Express 5, Zod                                                                |
| Database              | MongoDB replica set, Mongoose                                                          |
| Images                | Multer, Sharp                                                                          |
| Authentication        | JWT HTTP-only cookie, bcrypt                                                           |
| Optional integrations | OpenAI vision, n8n                                                                     |
| Quality               | Node test runner, real MongoDB replica-set integration tests, Prettier, GitHub Actions |

## Repository structure

```text
backend/
  scripts/                  # Admin seed and source checks
  src/
    config/                 # Validated environment and MongoDB connection
    integrations/           # OpenAI and n8n clients
    middleware/             # Auth, upload, origin checks and errors
    modules/
      auth/                 # Routes, controller, schemas, session service
      dashboard/            # Member/admin summary endpoints
      submissions/          # Upload/review endpoints, model, reward decisions
      rewards/              # Points ledger model
      users/                # Member/admin account model
    shared/                 # Calendar-date and pagination rules
    app.js                  # Express composition, no listening side effects
    server.js               # Database bootstrap and HTTP lifecycle
  test/                     # Domain and HTTP/database regression tests
frontend/
  src/
    app/                    # Route adapters, layouts, loading/error boundaries
    features/               # Auth, dashboard, submissions, admin, rewards screens
    components/             # Shared shell, pagination and status filter
    lib/                    # HTTP client and paginated resource hook
  next.config.mjs
n8n/                          # Importable date-check workflow
docs/                        # Architecture, API and deployment guidance
```

## Quick start

Requirements: Node.js 22 LTS, npm 10+, and Docker Engine/Desktop for local MongoDB and n8n. MongoDB must run as a replica set because rewards use transactions.

```bash
git clone https://github.com/simranrizvi/ostras-rewards.git
cd ostras-rewards
cp .env.example .env
cp frontend/.env.example frontend/.env.local
npm ci
docker compose up -d
npm run dev
```

| Service                | Address                          |
| ---------------------- | -------------------------------- |
| Member/admin web       | http://localhost:3001            |
| API liveness           | http://localhost:4100/api/health |
| API database readiness | http://localhost:4100/api/ready  |
| n8n editor             | http://localhost:5678            |

On Windows PowerShell, use `Copy-Item` instead of `cp` if needed. The API always loads the root `.env`; upload paths are resolved relative to `backend`, independent of the shell's working directory.

Set private `JWT_SECRET` and `N8N_CALLBACK_SECRET` values. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` before creating an administrator:

```bash
npm run seed:admin
```

The seed command creates the configured account or resets that account's admin password/role. Never use example credentials in a deployed environment.

### Manual review mode

Leave `N8N_WEBHOOK_URL` empty. Registration, uploads, admin review, approvals and reward history work without paid external services. Photos enter `pending_review` until an admin makes a decision.

### Enable automatic expiry checks

1. Add a private `OPENAI_API_KEY` to root `.env`; `OPENAI_MODEL` selects the vision-capable model.
2. Import `n8n/expiry-reward.workflow.json` in n8n.
3. Create an **HTTP Header Auth** credential named `Ostras Automation Secret`: header `x-automation-secret`, value matching `N8N_CALLBACK_SECRET`.
4. Select this credential on both the Webhook and HTTP Request nodes.
5. The local callback URL is `http://host.docker.internal:4100/api/submissions/automation/result`. Change it when deploying remotely.
6. Activate the workflow and set `N8N_WEBHOOK_URL=http://localhost:5678/webhook/ostras-expiry-reward` in root `.env`.
7. Restart the API. Submit a clear photo showing the printed expiry date.

The backend reads the local photo and sends a base64 image to OpenAI. n8n receives the extracted date and confidence; it does not need access to private image URLs. The callback's member identity is never trusted: rewards use the original uploader stored in MongoDB.

## Verification and developer commands

```bash
npm run dev          # Both apps in development
npm run build        # Web production build
npm run start        # Production processes; run build first
npm run check        # Backend JavaScript syntax checks
npm test             # Domain + real database/API integration tests
npm run format       # Apply shared formatting
npm run verify       # Formatting, syntax, tests and production build
```

Tests start an isolated temporary MongoDB replica set using `mongodb-memory-server`; its MongoDB binary is downloaded on first use. No OpenAI/n8n keys are required. A restricted runtime that cannot start MongoDB can run domain tests with `npm run test:unit`; full integration tests run in CI. To use an existing **dedicated test** replica set, set `TEST_MONGODB_URI` with a database name containing `test`. The integration suite clears its test collections; never point it at application data.

## Reward rules

- Expiry dates are validated calendar dates, compared in UTC, and remain valid through the expiry day.
- An earlier date becomes `expired` and earns zero points.
- OCR confidence below `0.78` or no readable date requires manual review.
- An approved submission earns `REWARD_POINTS` (default 100), or the administrator's chosen positive integer amount.
- Final `approved`, `expired` and `rejected` decisions are not changed by callback retries.
- A unique reward-per-submission index and a MongoDB transaction protect the submission decision and ledger together.
- Duplicate checks detect identical bytes for the same member. Cropped, recompressed or shared photos require operational review; this is not a complete fraud-detection system.

## Deployment and operational scope

The Compose file supplies **development MongoDB and n8n**, not container images for the web/API. Deploy `frontend` and `backend` as separate Node.js services and follow [deployment instructions](docs/deployment.md). Use HTTPS, same-site app/API domains, private persistent upload storage, database backups and proper secrets. Multi-instance API deployment requires shared rate-limit state and shared private image storage.

Live OpenAI calls and a deployed n8n execution require your credentials and infrastructure. CI verifies the API callback and reward behavior without making paid external calls. Points redemption, product ownership verification, email recovery and perceptual image matching are not implemented.

For the free Vercel/Render setup, use `IMAGE_STORAGE=mongodb` and the Vercel `API_PROXY_URL` configuration described in [deployment instructions](docs/deployment.md).
