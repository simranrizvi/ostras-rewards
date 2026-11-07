# Ostras Rewards

Ostras Rewards is the original product-submission and rewards app. A member uploads a photo of a product; the backend reads the printed expiry date, n8n compares it with today's date, and a valid submission earns points for the same member who uploaded it. Unreadable dates go to an admin review queue.

This is a separate project from the Ostras Social Content Studio. Keep the two repositories independent.

## What the app does

- Member registration and sign in with a secure HTTP-only session.
- Member profile includes full name, email, phone, ZIP/postal code, birthday, gender, and optional referral code.
- Product photo upload for JPG, PNG, and WEBP.
- OpenAI vision reads the expiry date from the uploaded image. Low-confidence or unavailable OCR is sent to manual review.
- n8n compares the expiry date to the current date and calls the protected backend workflow endpoint.
- The backend checks the date again and records an idempotent reward ledger entry against the submission's original `userId`. A retry cannot award points twice.
- Members see their points, photo submissions, detected expiry dates, and review status.
- Admins can review unclear photos, approve or reject submissions, set points, and see totals.
- MongoDB transactions keep the submission decision and reward ledger update together. The local MongoDB container starts as a replica set for transaction support.

## Stack

| Part | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, JavaScript |
| Backend | Node.js, Express, JavaScript |
| Database | MongoDB, Mongoose |
| Photo date reading | OpenAI Vision API |
| Date automation | n8n webhook workflow |
| Sessions | JWT in HTTP-only cookie, bcrypt password hashes |

## Folders

```text
frontend/       Next.js member portal and admin review panel
backend/        Express API, MongoDB models, photo processing, reward logic
n8n/            Importable expiry-date workflow
```

## Local setup

Requirements: Node.js 20.9+, npm, and Docker Desktop (or Docker Engine).

1. Start MongoDB and n8n:

   ```bash
   docker compose up -d
   ```

2. Prepare environment files:

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   ```

3. Put a private OpenAI key in `.env` as `OPENAI_API_KEY`. This is used by the backend to read the expiry date from a product image. Set strong values for `JWT_SECRET` and `N8N_CALLBACK_SECRET` before using the app.

4. Install dependencies and start both apps:

   ```bash
   npm install
   npm run dev
   ```

   Frontend: `http://localhost:3001`  
   Backend health: `http://localhost:4100/api/health`  
   n8n: `http://localhost:5678`

5. Import `n8n/expiry-reward.workflow.json` in n8n. Create an **HTTP Header Auth** credential named `Ostras Automation Secret` with header `x-automation-secret` and the exact same value as `N8N_CALLBACK_SECRET` in `.env`. Select that credential in both the Webhook node and the HTTP Request node.

6. Activate the workflow. Set `N8N_WEBHOOK_URL` in `.env` to the workflow's production webhook URL, normally `http://localhost:5678/webhook/ostras-expiry-reward`, then restart the backend.

7. Create the admin user:

   ```bash
   npm run seed:admin
   ```

   Set a strong `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` first. Sign in with that account to open the admin review panel.

## Expiry and reward rules

- A product expiry date that is today or later is treated as valid through that calendar day.
- A date earlier than today is marked expired and does not earn points.
- OCR confidence below `0.78`, or an unreadable date, sends the submission to admin review.
- A valid date earns `REWARD_POINTS` (100 by default). Admins can enter a different point value when manually approving a clear product.
- Reward entries are linked to both the member and a unique submission ID; the backend obtains the member ID from MongoDB and does not trust a user ID supplied by n8n.
- If OpenAI or n8n is unavailable, the photo is saved and moved to manual review instead of being lost.

## Data and API

Primary models:

- `User`: account and member profile.
- `Submission`: photo, expiry result, review decision, and points awarded.
- `Reward`: immutable points ledger entry, unique per submission.

Key routes:

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a member account |
| POST | `/api/auth/login` | Start a member/admin session |
| GET | `/api/dashboard/me` | Member points and recent submissions |
| POST | `/api/submissions/upload` | Submit a product photo |
| GET | `/api/submissions/mine` | Member submissions and reward history |
| GET | `/api/submissions/admin/all` | Admin review queue |
| PATCH | `/api/submissions/admin/:submissionId/review` | Admin approval or rejection |
| POST | `/api/submissions/automation/result` | Protected n8n result callback |
| GET | `/api/dashboard/admin` | Admin summary totals |

## Deployment notes

Deploy `frontend/` and `backend/` as separate services. Use HTTPS and set `WEB_ORIGIN`, `API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL`, MongoDB Atlas replica-set URI, and secrets for the production environment. n8n and the backend must be able to reach each other. Configure the webhook credential, and replace the starter workflow's local callback URL with the deployed API URL. Use durable private object storage for uploads rather than local disk in production; retain only the photo data needed for reward reviews.
