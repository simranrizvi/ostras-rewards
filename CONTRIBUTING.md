# Contributing

Use Node.js 22 and npm workspaces. Install at the repository root with `npm ci`; do not create per-app lockfiles. Copy the environment examples and use the manual-review mode when external credentials are unavailable.

Keep web route files small and place page behavior in `frontend/src/features`. Reuse the shared API client and paginated resource hook. Add API capabilities inside the appropriate module, with HTTP concerns in routes/controllers and transaction/integration logic in services/clients. Validate input at the boundary and enforce roles on the API.

Run `npm run format` followed by `npm run verify` before pushing. Add regression tests for reward, authorization, upload and integration-boundary behavior. Integration tests use a real temporary MongoDB replica set and no paid services. Never include credentials, member photos, personal data or generated build folders in commits.

Describe the user-visible change, affected API paths and verification in pull requests. For a change to reward rules or production storage, document the operational impact in `docs/`.
