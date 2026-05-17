# Alok Nestack Submission

Context-aware rate limiter built with Node.js and Express. The service applies a different request limit based on the caller tier and the route's endpoint type.

## Deployment

Deployment link: https://alok-nestack-submission.onrender.com

## How to run

Install dependencies:

```bash
npm install
```

Start the service:

```bash
npm start
```

For local development with automatic restart:

```bash
npm run dev
```

The server listens on port `3000` by default. You can override it with `PORT`.

Example request:

```bash
curl -X POST http://localhost:3000/ai/generate \
  -H "X-User-Id: user-123" \
  -H "X-User-Tier: free"
```

Run the test suite:

```bash
npm test
```

## Routes

The assessment routes are:

```text
POST /ai/generate   endpoint type: ai
POST /ai/summarise  endpoint type: ai
GET  /data/list     endpoint type: read
GET  /data/export   endpoint type: read
```

Each successful request returns:

```json
{ "ok": true }
```

## Rate limiting rules

The implemented limits are:

```text
free + ai   = 5 requests per 60 seconds
free + read = 30 requests per 60 seconds
paid + ai   = 30 requests per 60 seconds
paid + read = 120 requests per 60 seconds
```

The user tier is read from the `X-User-Tier` request header. Missing or invalid values are treated as `free`. The user identifier is read from `X-User-Id`; if it is absent, the service falls back to the request IP address.

When a caller exceeds the limit, the middleware returns HTTP `429` and does not call the route handler:

```json
{
  "error": "rate_limit_exceeded",
  "limit": 5,
  "window_seconds": 60,
  "retry_after_seconds": 34
}
```

`retry_after_seconds` is calculated from the active window and clamped so it never becomes negative.

## Design decisions

The endpoint type is supplied through route-level middleware, for example `endpointType('ai')`, instead of reading the URL path. This keeps the route classification explicit and avoids coupling the limiter to path naming.

Usage is stored in a small in-memory `Map`. Each key combines the user identifier, normalized tier, and endpoint type, so the same user can have separate counters for `ai` and `read` endpoints. Each record stores a count and a window start timestamp. When the 60 second window has elapsed, the count is reset on the next request.

The rate limit operation is synchronous and contains no `await` between reading and writing the counter. In a single Node.js process this keeps counter updates consistent for normal concurrent HTTP requests.

## Limitations

The store is process-local. Restarting the server clears all counters, and running multiple server instances would give each instance a separate limit window. A production deployment behind multiple instances would need shared state, but the assessment explicitly requires in-memory-only storage.

The fallback user identity is the request IP address, which can group multiple callers together when they share a network or proxy. For more precise production behavior, callers should provide a stable authenticated user id. This implementation accepts `X-User-Id` for that purpose because the assessment did not specify an authentication layer.

No external database, Redis, Memcached, file storage, or rate-limiting library is used.
