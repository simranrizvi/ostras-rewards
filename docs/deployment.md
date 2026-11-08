# Deployment

## Service configuration

Deploy the workspace with Node.js 22, install with `npm ci`, build using `npm run build`, then start each service independently:

```bash
npm run start -w @ostras-rewards/backend
npm run start -w @ostras-rewards/frontend
```

Set root `.env` or inject the same variables through the hosting environment. `NEXT_PUBLIC_API_URL` must be present when building the web app; its value is compiled into the client bundle.

| Variable                      | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| NODE_ENV                      | `production` on hosted services                             |
| PORT                          | API listener, default 4100                                  |
| WEB_ORIGIN                    | Exact web origin, e.g. `https://rewards.example.com`        |
| API_PUBLIC_URL                | Public HTTPS API origin                                     |
| NEXT_PUBLIC_API_URL           | API origin available to browsers, set at web build time     |
| MONGODB_URI                   | Private replica-set/Atlas connection URI                    |
| JWT_SECRET                    | Private random string of at least 32 characters             |
| COOKIE_SECURE                 | `true` in production                                        |
| TRUST_PROXY_HOPS              | Trusted reverse proxy hop count; leave 0 for direct access  |
| UPLOAD_DIR                    | Persistent private directory, absolute path recommended     |
| MAX_UPLOAD_MB                 | Per-photo byte limit, 1–20 MB, default 8                    |
| REWARD_POINTS                 | Default positive integer reward, default 100                |
| OPENAI_API_KEY / OPENAI_MODEL | Server-only vision credentials and model                    |
| N8N_WEBHOOK_URL               | Activated n8n production webhook; empty enables manual mode |
| N8N_CALLBACK_SECRET           | Private shared header credential                            |
| ADMIN_EMAIL / ADMIN_PASSWORD  | Initial/reset admin seed credentials                        |

Production startup rejects example JWT/workflow secrets and insecure cookies. Keep frontend and API on the same site, for example `rewards.example.com` and `api.example.com`, so SameSite=Lax cookies and private image requests work. For unrelated domains, use a same-site reverse proxy; this starter does not configure third-party session cookies.

## Storage and upgrades

The API serves photos through authenticated routes. Never expose the upload directory directly through a proxy or static host. Use a durable private mounted volume for a single API instance. For multiple instances, implement shared private object storage and a shared rate-limit store before scaling. Back up both MongoDB and images. Define deletion/retention policies appropriate to the deployment.

Existing installations can keep `backend/uploads` in place. When upgrading from the workspace layout, move `apps/api/uploads` contents to `backend/uploads`, or point `UPLOAD_DIR` at the existing persistent directory. The API rewrites legacy image URLs on reads. Existing records without image fingerprints remain readable; only newly uploaded identical files are checked by the hash index. The old `/uploads` public endpoint is removed.

MongoDB transactions require a replica set. Back up before upgrades. Startup initializes indexes; provision indexes in a controlled migration when collections are large. No destructive database schema migration is needed by this restructure.

## n8n

Use a maintained, pinned n8n version and persistent data volume in production. Set its public URL, timezone and credential encryption configuration according to your hosting setup. Import the workflow, attach header credentials on both ends, update the callback URL to the hosted API, and activate it. Keep editor access protected. Workflow dates deliberately use UTC even when the editor timezone differs.

## Readiness and shutdown

Use `/api/health` for liveness and `/api/ready` for readiness. MongoDB/index setup completes before the listener starts. SIGTERM/SIGINT drain HTTP requests, close MongoDB and exit, with a forced shutdown deadline. Forward `x-request-id` to support when an API error needs investigation.

## Release validation

1. Run `npm run verify` or require a passing GitHub Actions run.
2. Register a member, upload a sample photo, and verify image access is denied to other members.
3. Review the photo as an admin and verify the member receives one credit.
4. For automatic mode, make a real OCR/n8n submission with deployment credentials and inspect workflow execution history.
5. Verify backups, persistent uploads and HTTPS session cookies on the actual host.

Tests cover local API and database behavior. Paid OpenAI calls, n8n credentials, proxy routing and storage persistence must also be checked in the target environment.
