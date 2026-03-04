## 1) Run the Project

### Install dependencies

```bash
npm install
```

If your local npm cache has permission issues on macOS, run:

```bash
sudo npm install
```

### Run backend API

```bash
npm run backend:dev
```

API base URL: `http://localhost:3000/api`

### Run mobile app

```bash
npm start
```

Optional API URL override for device testing:

```bash
EXPO_PUBLIC_API_URL=http://<your-ip>:3000/api npm start
```

### Run tests

```bash
npm run backend:test
```

## 2) API Endpoints

- `GET /api/gyms` – list gyms and slots
- `GET /api/gyms/:id/capacity` – current fullness percentage and slot-level capacity
- `POST /api/gyms/:id/book` – book a slot (`slotId`, `userId`, optional `idempotencyKey`)
- `POST /api/debug/reset` – reset in-memory state (debug utility)

## 3) Key Architectural Decisions

### Concurrency safety (no overbooking)

Booking uses a **per-slot lock** in `backend/src/bookingLock.ts`, so requests for the same slot are serialized. The critical section executes read-check-write atomically.

### Repository pattern + mocked persistence

`backend/src/repository.ts` exposes a repository interface with an in-memory implementation. This keeps booking logic decoupled from storage and ready for a real DB later.

### Idempotency

`idempotencyKey` values are stored and replay the original result for retries, preventing duplicate side effects in unstable network conditions.

### Fast capacity path

`GET /capacity` uses a short TTL in-memory cache (5s) for low-latency reads while preserving near-real-time freshness.

### Mobile structure

The Expo screen in `src/app/index.tsx` consumes a typed API client (`src/features/gym/api.ts`) and uses reusable typed UI primitives (`CapacityRing`, `StateBanner`) for loading/success/error states.

## 4) Testing

Critical booking logic is covered with Vitest:

- concurrent burst booking does not exceed capacity
- idempotency replay returns the original booking result

See `backend/tests/bookingService.test.ts`.

## 5) Trade-offs and Next Improvements

### Current trade-offs

- In-memory state and lock are single-instance only.
- Lambda adapter is minimal and focused on the case-study scope.
- CDK snippet is provided as infrastructure code sample, not a full deploy-ready app package.

### What I would improve next

1. Replace in-memory repository with DynamoDB or PostgreSQL.
2. Enforce concurrency at persistence layer (conditional writes or row locks).
3. Add auth + user identity propagation.
4. Add observability (structured logs, trace IDs, metrics/alarms).
5. Add integration tests for API routes and contract validation.

## 6) Bonus: ElastiCache Strategy for Global `GET /capacity`

For global low-latency reads:

1. Cache each gym capacity payload in Redis with a short TTL (e.g., 3-5s).
2. Use write-through invalidation on successful booking events.
3. Keep region-local caches and route users to nearest region.
4. Add stale-while-revalidate fallback to absorb spikes.

This reduces database pressure and keeps the mobile capacity screen fast during peak concurrency.
