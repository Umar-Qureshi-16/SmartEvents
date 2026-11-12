# SmartEvents — Assumptions & Design Decisions

> Written as per the Antigravity Agent Prompt requirement.
> All assumptions made during autonomous implementation are logged here so they can be reviewed, challenged, or verified.

---

## Auth & Security

| # | Assumption | Rationale |
|---|---|---|
| A1 | Public `/register` is limited to `customer` and `provider` roles. `admin` / `superadmin` accounts must be created via the seed script or directly in MongoDB. | Prevents privilege escalation through the public API — a standard access-control pattern. |
| A2 | JWTs are stored in `localStorage`. Moving to `httpOnly` cookies is documented in Known Limitations but is out of scope for FYP-2. | The scope note is explicit in the README. No security claim is made that is not true. |
| A3 | Password-reset tokens are emailed, never returned in the response body. | The original code returned the token in the response, which defeats the purpose. Fixed. |

---

## Real-Time Negotiation

| # | Assumption | Rationale |
|---|---|---|
| B1 | Socket.IO room membership is verified server-side on `join-negotiation`: the caller must be the `customerId` or `vendorId` on that booking. | The original code let any connected client join any room by guessing a booking ID. |
| B2 | Optimistic concurrency (`versionKey`) is retained on the Booking model. Simultaneous counter-offers from both parties cause the second to fail with a 409 and a "please refresh" message. | This is the correct behaviour — silently overwriting is worse than a friendly error. |
| B3 | WebSocket connections are not supported on Vercel's serverless runtime. The README and deployment section document this and recommend Render / Railway / Fly.io for the API. | Stated assumption rather than workaround. |

---

## AI Chatbot (Smartie)

| # | Assumption | Rationale |
|---|---|---|
| C1 | Groq (`llama-3.1-8b-instant`) replaced an earlier Gemini integration. All leftover `GEMINI_API_KEY` references have been removed from the README; the env-var template still lists it as optional for embeddings if a future developer re-enables that path. | The prompt explicitly asked for Gemini cleanup. |
| C2 | Context injection (fresh MongoDB records per request) is used instead of true RAG/vector retrieval. This is labelled accurately in the codebase, the README, and the code comments. | At this data scale, full-context injection is faster and more accurate than vector retrieval. The design decision is defensible at a viva. |
| C3 | Smartie falls back to a static "I'm having trouble connecting" response when Groq is unavailable. The demo never shows an empty state. | Required for demo reliability. |

---

## Data Model

| # | Assumption | Rationale |
|---|---|---|
| D1 | Booking uses `customerId` / `vendorId` field names (not `userId` / `providerId`). All services, tests, and queries use these names consistently. | The fraud engine previously queried the wrong field names and always returned 0. Fixed. |
| D2 | `no_show` is a valid booking status in the Mongoose enum. Queries that previously missed it (returning 0 from fraud / trust calculations) were corrected. | Verified against the Booking schema. |
| D3 | `Ticket` model uses `qrCodeData`, `ticketType`, `checkInTime`, `status: active|checked_in|refunded|cancelled` — the schema from the live `server/src/models/Ticket.js`, not a different draft schema. | The duplicate `src/` backend was removed; this model was the canonical one. |

---

## Testing

| # | Assumption | Rationale |
|---|---|---|
| E1 | Tests run against a local MongoDB instance (`127.0.0.1:27017`) when available, falling back to `mongodb-memory-server`. `setup.js` reuses the open Mongoose connection across test suites (`--runInBand`) to avoid 180 s binary-download timeouts on the fallback path. | Previous setup closed the connection in `afterAll`, causing subsequent suites to re-initiate and hit the 180 s Jest timeout. |
| E2 | The original 28 end-to-end tests in `server/tests/e2e.js` are retained and wired to `npm run test:e2e`. They require a running server (`npm run dev` first). They are excluded from the Jest suite intentionally. | They use a different runner (raw `node`) and require live infrastructure. |
| E3 | Frontend component tests are listed as out-of-scope for this session (backend coverage is present; Vitest/React Testing Library would be the right tool for the client). | Time-boxed scope decision. Documented here and in the improvement plan. |

---

## Deployment

| # | Assumption | Rationale |
|---|---|---|
| F1 | `vercel.json` was repaired to point at `server/index.js` (not the deleted `server/server.js`). However the README notes that WebSocket-dependent features will not function on Vercel serverless — a separate long-lived host is needed for the API. | Technically correct configuration even if the runtime is sub-optimal for this feature set. |
| F2 | MongoDB Atlas connection string rotation (§0.2) is left to the developer — it requires Atlas credentials that are outside this agent's scope. | Documented as a required manual step. |

---

## Scope Omissions (Deliberate, Not Oversights)

| Item | Decision |
|---|---|
| Payment processing | Out of scope. The platform records an agreed price; settlement is off-platform. The UI does not claim otherwise. |
| `httpOnly` cookie auth | Documented as a known limitation. Would require touching every auth flow end-to-end; not worth the risk at this stage. |
| Native mobile app | Not in scope. The web client is responsive. |
| CDN / multi-region | Out of scope for a single-instance FYP deployment. |
