# API reference

Base URL: `http://localhost:4100/api`. JSON requests use `Content-Type: application/json`; browser clients send credentials. Authentication uses `ostras_session`, an HTTP-only, SameSite=Lax cookie.

| Method | Route                                     | Access                     | Result                                    |
| ------ | ----------------------------------------- | -------------------------- | ----------------------------------------- |
| GET    | `/health`                                 | Public                     | Process liveness and request ID           |
| GET    | `/ready`                                  | Public                     | 200 when MongoDB connected; otherwise 503 |
| POST   | `/auth/register`                          | Public, rate limited       | Create member and session                 |
| POST   | `/auth/login`                             | Public, rate limited       | Start session                             |
| GET    | `/auth/me`                                | Member/admin               | Current account                           |
| POST   | `/auth/logout`                            | Public                     | Clear session, 204                        |
| GET    | `/dashboard/me`                           | Member/admin               | Own totals and recent activity            |
| GET    | `/dashboard/admin`                        | Admin                      | Global totals and status counts           |
| POST   | `/submissions/upload`                     | Member/admin, rate limited | Multipart `image` file; create submission |
| GET    | `/submissions/mine`                       | Member/admin               | Own paginated history                     |
| GET    | `/submissions/rewards/mine`               | Member/admin               | Own paginated reward credits              |
| GET    | `/submissions/:submissionId/image`        | Owner/admin                | Private original product image            |
| GET    | `/submissions/automation/status`          | Member/admin               | Whether webhook dispatch is configured    |
| POST   | `/submissions/automation/result`          | Workflow secret            | Idempotent date decision                  |
| GET    | `/submissions/admin/all`                  | Admin                      | Paginated review queue/history            |
| PATCH  | `/submissions/admin/:submissionId/review` | Admin                      | Manual decision                           |
| GET    | `/submissions/admin/rewards`              | Admin                      | Latest 250 rewards                        |

## Account requests

Registration requires `fullName`, `email`, and `password` (at least 10 characters, at most 72 UTF-8 bytes). Optional fields: `phone`, `zipCode`, `birthday` (valid YYYY-MM-DD, no future dates), `gender`, `referralCode`. Login requires email and password. Responses return `{ user }` and never expose the password hash.

## Pagination

History, member rewards and admin submissions accept `page` (default 1) and `limit` (default 10, maximum 50). Submission history and admin queues also accept `status`: `processing`, `pending_review`, `approved`, `rejected`, `expired`, `failed`. Invalid filters return 422.

```json
{
  "submissions": [],
  "pagination": { "page": 1, "limit": 10, "total": 0, "pages": 0 }
}
```

Member submission history also returns the lifetime point total as `points`, independent of the current filter. Reward history returns `rewards` with the same pagination metadata.

## Workflow callback

Send `x-automation-secret` matching `N8N_CALLBACK_SECRET`:

```json
{
  "submissionId": "507f1f77bcf86cd799439011",
  "expiryDate": "2099-12-31",
  "confidence": 0.95,
  "isExpired": false,
  "note": "Expiry date read from label."
}
```

`expiryDate` can be null for unreadable labels. Impossible dates or IDs return 422. An expiry comparison inconsistent with the backend returns 409. Confidence below 0.78 routes to manual review. Supplied user IDs are ignored.

## Manual review

Approve with `{ "decision": "approve", "expiryDate": "2099-12-31", "points": 100, "note": "Verified label" }`. Points are optional, positive integers up to 100000. A past date marks the product expired without awarding points.

Reject with `{ "decision": "reject", "note": "Unreadable image" }`. Rejection does not require a date or points. Terminal records cannot be rejected again; repeated approvals return the stored terminal decision without issuing another credit.

## Errors

Errors use `{ "error": "Human-readable message" }`; centralized errors also contain `requestId`. Every request receives an `x-request-id` header. Common status codes: 401 session/secret required, 403 forbidden role/origin, 404 missing/private resource, 409 duplicate/conflict, 413 upload too large, 422 invalid input, 429 rate limit, 500 unexpected failure. Internal error details remain in server logs.
