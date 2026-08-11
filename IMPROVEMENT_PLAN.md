# SmartEvents — Improvement Plan to Industry Standard

> **Companion to:** [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
> **Written:** 2026-08-12 · **Target:** FYP-2 final submission, defensible at viva, deployable
> **Audience:** you (the developer) — every item is a concrete task with a file path and an acceptance criterion.

---

## Executive Summary

The architecture here is genuinely good. Layered backend, service extraction, optimistic concurrency on the negotiation model, Zod validation middleware, an append-only offer history, refresh-token rotation with a request queue, WebSocket rooms, and a real LLM integration — this is well above the median FYP.

The problem was **not architecture. It was finishing.** The gap between what the project claimed and what a user could actually do is where marks get lost.

### Status as of 2026-08-12

**Phases 0 and 1 are complete** (commits `3bd9f8b` → `2f35be6`). What that closed:

| Was | Now |
|---|---|
| Any email + any password signed in — both auth pages fabricated a session when the API call failed | Authentication fails closed |
| Signup never created a real account (it sent roles not in the schema enum, so it always fell into that fallback) | Registration works, then auto-signs-in for a real session |
| Anyone could register as `superadmin` | Public signup limited to `customer` / `provider` |
| Every validation failure returned 500 with no field messages (Zod 4 removed `err.errors`) | Proper 400s with per-field messages |
| Any client could join any negotiation room and watch strangers' prices | Sockets authenticated; room joins verify booking membership |
| `forgot-password` returned the reset token in the response body | Emailed only |
| Every toast in the app was invisible | `<Toaster />` mounted; ~120 calls across 30 files now render |
| A customer could open `/admin/users` and see it render | `ProtectedRoute` with role checks |
| Negotiation notes never displayed — in the flagship feature | Visible, with an `action` badge that reflects reality |
| Ticket purchase returned 500 on every success | Returns 201 |
| Provider earnings always read $0; booking count showed cancellations | Both correct |
| Fraud scores always 0; trust scores always 100 | Both discriminate |
| Password reset always failed | Works end to end |
| Authorization failures surfaced as 500 | Typed errors → correct 403 |
| A duplicate abandoned backend broke ticket writes, and `vercel.json` deployed it | Removed; deployment repointed |
| Zero git commits | Four, with a recoverable baseline |

**Verified:** 23 end-to-end API assertions against a live server and database, 3 WebSocket-auth assertions, all 13 routers loading, and a passing client production build.

⚠️ **One item still needs you personally: rotate the leaked MongoDB Atlas password (§0.2).**

### What remains

- **~2,000 lines of finished UI are still orphaned** — including all seven SuperAdmin governance widgets, whose backends already work. **This is now the single highest value-per-hour work available** (Phase 2).
- Dark mode is visibly broken and three design systems compete (Phase 3).
- There are still **zero automated tests** (Phase 4).
- No payment integration exists (documented as future work).

**The plan is sequenced so you can stop at any phase boundary and still have a coherent, defensible project.** Phase 2 is what turns claims in your report into screens you can demo. Phase 3 is what makes it look professional. Phases 4–6 are the industry-standard polish.

**Remaining estimate: ~45–60 focused hours.**

---

## Phase 0 — Safety Net & Cleanup ✅ **DONE (2026-08-12)**

*This phase has been completed. Two commits exist: `3bd9f8b` (baseline snapshot of everything as it was) and `e61bd33` (the cleanup). Anything deleted is recoverable with `git show 3bd9f8b:<path>`. The subsections below are kept as a record of what was done and why.*

### 0.1 Version control ✅

The repo had zero commits — no undo for anything. Now baselined:

```bash
git show 3bd9f8b            # everything exactly as it was, pre-cleanup
git show e61bd33 --stat     # what the cleanup changed
```

**Still to do:** push to a private GitHub repo. From here on, commit per logical change with conventional-commit messages (`fix:`, `feat:`, `refactor:`, `docs:`). A clean, readable commit history is itself a marked deliverable in most FYP rubrics.

### 0.2 🔴 Rotate the leaked database credential — ⚠️ **YOUR ACTION REQUIRED**

The root `server.js` hardcoded a live MongoDB Atlas connection string **including the password**. The file is now deleted, **but the credential is still compromised** — it existed on disk and may have been shared, screenshotted, or backed up.

Deleting the file does not rotate the password. You must:

1. Log into MongoDB Atlas → **Database Access** → change that user's password.
2. Update `server/.env` with the new URI.
3. ~~Delete the root `server.js`.~~ ✅ done
4. ~~Confirm `.gitignore` covers `.env`.~~ ✅ done

**This is the one item in Phase 0 I could not do for you. Do it before you deploy or share the repo.**

### 0.3 Resolve the duplicate backend ✅

`server/src/` was an abandoned earlier version of the project ("EventFlow") that was actively causing bugs through duplicate Mongoose model registration.

**Step 1 — migrated the two live files:** ✅
- `server/src/controllers/ticket.controller.js` → `server/controllers/ticketController.js`
- `server/src/models/Ticket.js` → `server/models/Ticket.js` (the `src` version was the schema the running app actually used: `qrCodeData`, `ticketType`, `checkInTime`, `status: active|checked_in|refunded|cancelled`). Added indexes on `attendee` and `event`.
- Fixed the notification field name in the migrated controller (§1.5) and routed it through `notificationService`
- `server/routes/ticketRoutes.js` repointed at `../controllers/ticketController`

**Step 2 — deleted:** ✅ all remaining files under `server/src/`, plus `server/server.js`.

**Verified:** all 13 routers load cleanly, and `mongoose.models` now contains exactly one of each — `AuditLog, Booking, ContextVector, Event, Notification, Review, Service, Ticket, User, VendorProfile`. The duplicate-registration hazard is gone.

**Step 3 — fixed the deployment config.** ✅ `vercel.json` was building `server/server.js`, the dead backend. Now repointed:

```json
{
  "version": 2,
  "builds": [
    { "src": "server/index.js", "use": "@vercel/node" },
    { "src": "client/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server/index.js" },
    { "src": "/(.*)", "dest": "client/index.html" }
  ]
}
```

> Note: Vercel's Node runtime is serverless and **does not support persistent WebSocket connections**. If you deploy there, Socket.IO will not work. For a project whose flagship feature is real-time, deploy the backend to **Render**, **Railway**, or **Fly.io** (all have free tiers and support long-lived connections) and host only the frontend on Vercel. Decide this now, because it changes your demo plan.

**Acceptance:** `node server/index.js` boots, `POST /api/v1/tickets/purchase` returns 201, and `grep -r "server/src" .` returns nothing.

### 0.4 Delete scratch and dead files ✅

Deleted: `server/debug_gemini.js`, `server/test-gemini.js`, `server/test-gemini-v2.js`, `server/test-chatbot.js`, `server/output.txt`, `server/models_list.json`, `server/logs/`, `client/refactor.js`, `client/refactor.cjs`, `client/README.md` (untouched Vite boilerplate), `ensure_test_users.js`.

`e2e_test.js` was **kept** — moved to `server/tests/e2e.js` with `npm run test:e2e` wired up. It is your only test asset. Also added `npm run seed` and `npm run seed:superadmin`.

`.gitignore` expanded to cover media, logs, uploads, and all `.env` variants.

> **`20260730-2035-14.7026751.mp4` (12.7 MB) was left on disk** — I couldn't tell whether it's your FYP demo recording. It's now git-ignored so it won't bloat the repo. Move it somewhere outside the project folder when you're sure you don't need it there.

### 0.5 Remove unused dependencies ✅ (server) / ⚠️ (client)

`joi` and `openai` were installed on the server but imported nowhere — Zod and Groq are used instead. **Removed.** Unused dependencies in a submitted `package.json` invite the question "did you actually write this?"

**Still outstanding:** on the client, `react-hook-form`, `@hookform/resolvers`, and `zod` are installed but **never used** (`useForm` appears in zero files). Either use them (Phase 3.8 recommends you do) or remove them. Do not leave them sitting there unused.

### 0.6 Triage the orphaned components ✅

**Deleted (12 files, superseded by newer equivalents):**
`Navbar.jsx` (→ `layout/DynamicNavbar.jsx`), `Topbar.jsx` (imported in App.jsx but never rendered), `AIAssistant.jsx` (→ `pages/AI/AIConcierge.jsx`), `NegotiationEngine.jsx` (→ `pages/Bookings/NegotiationPage.jsx`), `NotificationBell.jsx` (→ `pages/Notifications`), `LiveNotifications.jsx`, `ChatButton.jsx`, `ChatModal.jsx`, `ChatModal.css`, `common/ChatWindow.jsx`, `MagneticWrapper.jsx`, `ScrollReveal.jsx`, `pages/Events/EventList.jsx` (→ `ExploreEvents.jsx`). The dangling `Topbar` import in `App.jsx` was removed. **Client build verified passing afterwards.**

**Kept for wiring up in Phase 2 — these are finished features, not dead code:**
`SuperAdmin/*` (all 7), `Dashboard/TrustScoreWidget`, `Dashboard/EventReadiness`, `Dashboard/BudgetAnalyzer`, `Dashboard/TimelineBoard`, `Dashboard/HeroAIMatchmaker`

---

## Phase 1 — Fix What's Broken ✅ **DONE (2026-08-12)** — commit `2f35be6`

*All fifteen defects are fixed and verified. §1.13 (booking schema mismatch) is the one item left open — see its entry. The subsections are kept as a record of each defect and its fix, which is exactly the material a report's "testing and debugging" chapter needs.*

**Verification performed:** 23 end-to-end API assertions against a live server and MongoDB, plus 3 WebSocket-authentication assertions — all passing. Client production build succeeds.

Two additional defects were found during this work and are recorded below as §1.16 and §1.17.

### 1.1 ✅ **DONE** — Mount the toast renderer

**Impact:** every one of the ~120 `toast.success()` / `toast.error()` calls across 30 files currently does nothing. Users click Accept Offer and see no confirmation. This is the single most damaging UX defect in the project, and it is a three-line fix.

Two toast systems exist and neither works: `react-hot-toast` is imported everywhere but `<Toaster />` is never rendered; the custom `ToastContext` *is* mounted but consumed by zero components.

**Decision: keep `react-hot-toast`** (30 files already use it) and delete `ToastContext.jsx`.

In `client/src/App.jsx`:
```jsx
import { Toaster } from 'react-hot-toast';
// ...inside the ThemeProvider, above <ErrorBoundary>:
<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: { background: 'var(--toast-bg)', color: 'var(--toast-fg)', borderRadius: '12px' },
    success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
    error:   { duration: 5000, iconTheme: { primary: '#F87171', secondary: '#fff' } },
  }}
/>
```
Then remove `<ToastProvider>` from `main.jsx` and delete `context/ToastContext.jsx`.

**Acceptance:** submit a counter-offer → a toast appears. Trigger a failing request → an error toast appears.

### 1.2 ✅ **DONE** — Close the privilege-escalation hole in signup

`server/utils/validation.js`:
```js
role: z.enum(['customer', 'provider', 'admin', 'superadmin']).default('customer')
```
Anyone can `POST /api/v1/auth/register` with `{"role":"superadmin"}` and own the platform. This is the kind of finding that turns a good grade into a bad one.

```js
role: z.enum(['customer', 'provider']).default('customer')
```
Admin and superadmin accounts must only be creatable by `scripts/seedSuperAdmin.js` or by an existing admin via `PUT /admin/users/:id/role`.

**Acceptance:** registering with `role: "superadmin"` returns 400.

### 1.3 ✅ **DONE** — Remove the default JWT secret

`server/middleware/authMiddleware.js` and `server/services/authService.js` both do:
```js
const JWT_SECRET = process.env.JWT_SECRET || 'fyp-secret-key';
```
Any deployment missing the env var signs tokens with a publicly-visible string — anyone can forge a superadmin token. Fail loudly at boot instead:

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is not set. Refusing to start.');
}
```
Extract this into a single `server/config/env.js` that validates all required environment variables at startup (a Zod schema over `process.env` works nicely here) — that is the industry-standard pattern, and it kills the duplicate-constant problem at the same time.

### 1.4 ✅ **DONE** — Authenticate WebSocket connections and rooms

`server/services/socketManager.js` accepts any connection and lets any client join any room:
```js
socket.on('join-negotiation', (bookingId) => socket.join(bookingId));
```
A client can join an arbitrary `bookingId` room and watch two strangers negotiate prices in real time. For a project whose thesis is *trustworthy* negotiation, this is a thesis-level flaw, not just a bug.

```js
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  // Derive the personal room from the verified token, never from client input
  socket.join(`user_${socket.user.id}`);

  socket.on('join-negotiation', async (bookingId) => {
    const b = await Booking.findById(bookingId).select('customerId vendorId');
    if (!b) return;
    const uid = socket.user.id;
    if (b.customerId.toString() !== uid && b.vendorId.toString() !== uid) return;
    socket.join(bookingId);
  });
});
```
Client side, in `WebSocketContext.jsx`:
```js
const newSocket = io(SOCKET_URL, { auth: { token: localStorage.getItem('token') } });
```
and delete the `join_dashboard` emit — the server now derives it from the token.

**Acceptance:** connecting without a token is rejected; joining a booking room you are not party to is silently ignored.

### 1.5 ✅ **DONE** — Fix ticket purchase (returned 500 on every success)

*Fixed during Phase 0 as part of the ticket-module migration. Recorded here for your report.*

`ticket.controller.js` saved the ticket, then called:
```js
await Notification.create({ user: req.user.id, title, message, type: 'system' });
```
The live `Notification` schema requires `recipient`, not `user`. The validation error is thrown inside the `try`, so the endpoint returns **500** even though the ticket persisted — the user sees a failure and may purchase again, creating duplicates.

```js
await Notification.create({
  recipient: req.user.id,
  title: 'Ticket Confirmed!',
  message: `Your ${ticketType || 'General'} ticket for "${event.title}" is ready. Ticket #: ${ticketNumber}`,
  type: 'system'
});
```
Better: route it through `notificationService.createNotification()` like every other notification in the codebase, so the user also gets the live socket push. And move the notification call **outside** the transaction-critical path — a notification failure should never fail a purchase:
```js
try { await notificationService.createNotification({...}); }
catch (e) { console.error('Notification failed (non-fatal):', e); }
```

### 1.6 ✅ **DONE** — Fix password reset (always failed)

`authController.resetPassword` destructures `{ token, newPassword }`; `resetPasswordSchema` requires `{ token, password }`. The field never arrives, so `bcrypt.hash(undefined)` throws.

Pick one name — `password` — and align the controller, the schema, and `client/src/pages/Auth/ResetPassword.jsx`.

**Acceptance:** full forgot → reset → login-with-new-password cycle works end to end.

### 1.7 ✅ **DONE** — Fix the token-refresh status-code mismatch

`verifyToken` returns **403** for an expired token. The Axios interceptor only attempts a refresh on **401**. Result: the entire refresh-token mechanism you built never runs, and every session dies abruptly after 24 hours with an unexplained failure.

In `authMiddleware.js`:
```js
jwt.verify(token, JWT_SECRET, (err, decoded) => {
  if (err) {
    // 401 = "your credential is stale, go refresh"
    // 403 = "your credential is fine but you lack permission"
    return res.status(401).json({
      message: err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token',
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
    });
  }
  req.user = decoded;
  next();
});
```
Keep 403 for `authorize()` and `verifySuperAdmin` — that is the semantically correct split, and it makes the interceptor work as designed.

**Acceptance:** set token expiry to `10s`, wait, make a request → it transparently refreshes and succeeds.

### 1.8 ✅ **DONE** — Make negotiation notes visible

The backend writes `negotiationHistory[].message`. `NegotiationPage.jsx` renders `{item.note}`. **Every note a user has ever written is invisible** — in the flagship feature of the project.

In `client/src/pages/Bookings/NegotiationPage.jsx`:
```jsx
{(item.message || item.note) && (
  <p className="text-sm font-medium leading-relaxed">{item.message || item.note}</p>
)}
```
Also fix the optimistic-update object in `handleAction`, which builds `{ price, note, offeredBy, timestamp }` — change `note:` to `message:` so the optimistic render matches the server render and the text doesn't vanish on refetch.

While you're in this file: `item.action` is read for the status badge but no schema ever writes it, so it always renders "proposed". Either add an `action` field to the `negotiationHistory` subdocument (`'offer' | 'counter' | 'accept' | 'reject'`) and set it in `bookingService`, or remove the badge.

### 1.9 ✅ **DONE** — Fix provider earnings (always showed $0)

`bookingController.getVendorDashboard`:
```js
{ $match: { vendorId: req.user._id, status: 'confirmed' } }
```
The JWT payload is `{ id, role }` — there is no `_id`, so this matches nothing. Additionally, `$match` in an aggregation pipeline does **not** auto-cast strings to ObjectIds the way `find()` does.

```js
const mongoose = require('mongoose');
const vendorObjectId = new mongoose.Types.ObjectId(req.user.id);
const totalEarnings = await Booking.aggregate([
  { $match: { vendorId: vendorObjectId, status: { $in: ['confirmed', 'completed'] } } },
  { $group: { _id: null, total: { $sum: '$offerPrice' } } }
]);
```
Audit every other use of `req.user._id` — the same bug is in `reviewController.deleteReview`, where `req.user._id.toString()` throws a TypeError and returns 500 for every delete attempt. Standardise on `req.user.id` everywhere, or (cleaner) have `verifyToken` normalise both:
```js
req.user = { ...decoded, _id: decoded.id };
```

### 1.10 ✅ **DONE** — Fix the fraud risk engine (all scores were 0)

`fraudRiskEngine.js` queries `Booking.countDocuments({ userId, ... })` and `{ providerId: userId }`. The `Booking` schema has **`customerId`** and **`vendorId`** — neither queried field exists, so every count is 0 and every provider scores LOW regardless of behaviour.

```js
const recentCancellations = await Booking.countDocuments({
  customerId: userId,
  status: 'cancelled',
  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
});
// and for providers:
const disputes = await Booking.countDocuments({ vendorId: userId, status: 'disputed' });
```

### 1.11 ✅ **DONE** — Make the trust score actually discriminate

Current formula starts at 100 and is mostly additive, then clamps at 100 — so a provider with 40 completed bookings and one with zero both score 100. The metric carries no information, yet it is displayed prominently as a trust signal.

Redesign as a **weighted ratio**, not a running tally:
```js
const completed  = await Booking.countDocuments({ vendorId, status: 'completed' });
const cancelled  = await Booking.countDocuments({ vendorId, status: 'cancelled', cancelledBy: vendorId });
const noShows    = await Booking.countDocuments({ vendorId, status: 'no_show' });
const lostDisputes = await Booking.countDocuments({ vendorId, disputeOutcome: 'refunded_customer' });
const total = completed + cancelled + noShows;

// New providers start neutral, not perfect — reputation must be earned.
if (total < 3) return 70;

const completionRate = completed / total;                       // 0–1
const avgRating = /* mean review rating for this vendor */ 0;   // 1–5
const ratingScore = avgRating ? (avgRating - 1) / 4 : 0.5;      // 0–1, neutral if unrated

let score = 100 * (0.55 * completionRate + 0.35 * ratingScore + 0.10);
score -= lostDisputes * 8;
score -= noShows * 5;
return Math.round(Math.max(0, Math.min(100, score)));
```
Document the formula in your report — a defensible, explainable scoring model is exactly the kind of thing an FYP examiner probes.

### 1.12 ✅ **DONE** — Remove fabricated data from API responses

`vendorController.getPublicProfile` returns invented vendors ("Grand Hyatt Ballroom", stock Unsplash photos, a fake 4.9 rating, `reviewsCount: 142`) whenever a profile isn't found. `getVendorDashboard` hardcodes `profileViews: 1200`; `vendorController.getDashboard` returns `Math.random() * 500` for the same metric.

If an examiner notices the platform inventing businesses and statistics, it undermines every other number you show them.

- `getPublicProfile` → return `404 { success: false, message: 'Vendor profile not found' }`. Put realistic demo vendors in `scripts/seedData.js` instead, where they belong.
- `profileViews` → either implement it properly (a `views` counter incremented in `getPublicProfile`) or delete the field from the API and the UI.

### 1.13 🟠 Fix the booking-creation schema mismatch

`bookingCreateSchema` requires `eventId`, but `bookingService.createBooking` explicitly supports direct vendor/service bookings (`vendorId` + `serviceId` + `eventDetails`). That entire code path is unreachable through the API.

```js
const bookingCreateSchema = z.object({
  eventId:   z.string().length(24).optional(),
  vendorId:  z.string().length(24).optional(),
  serviceId: z.string().length(24).optional(),
  offerPrice: z.coerce.number().min(0),
  message: z.string().max(500).optional(),
  eventDetails: z.object({
    eventType: z.string().min(2),
    date: z.coerce.date(),
    location: z.string().min(2),
    budget: z.coerce.number().min(0).optional(),
  }).optional(),
}).refine(d => d.eventId || d.vendorId, {
  message: 'Either eventId or vendorId is required'
});
```

### 1.14 ✅ **DONE** — Zod v4 error shape (confirmed broken, now fixed)

`validate()` in `server/utils/validation.js` does `err.errors.map(...)`. In **Zod 4** (which is what's installed: `^4.4.3`), the canonical property on `ZodError` is `issues`, and `.errors` was removed. If so, every validation failure throws a `TypeError` inside the error handler and returns a 500 instead of a helpful 400.

**Verify by testing** — `POST /api/v1/auth/register` with `{"email":"nope"}` should return 400 with field-level messages. If it returns 500, fix:
```js
} catch (err) {
  const issues = err.issues ?? err.errors ?? [];
  return res.status(400).json({
    success: false,
    message: 'Validation Error',
    errors: issues.map(e => ({ path: e.path.join('.'), message: e.message }))
  });
}
```
Use `??` so it works under either version.

### 1.15 ✅ **DONE** — Stop loading the entire Booking collection on every AI query

`aiService.generateResponse` runs:
```js
const recentBookings = await Booking.find().populate('eventId');   // ← no filter, ALL bookings
const myBookings = recentBookings.filter(b => b.eventId && b.eventId.createdBy.toString() === userId);
```
This loads every booking in the database into Node's memory and filters in JavaScript. With a seeded demo it's fine; with any realistic data it will hang the server. Push the filter into Mongo:

```js
const myEventIds = await Event.find({ createdBy: userId }).distinct('_id');
const myBookings = await Booking.find({
  $or: [{ eventId: { $in: myEventIds } }, { vendorId: userId }],
  status: { $in: ['confirmed', 'completed'] }
}).populate('eventId', 'title price').lean();
```

Also drop the wasted Gemini embedding call in `aiController.queryAI` — the vector is computed and then ignored by `retrieveContext`. Either **(a)** remove `createEmbedding` from the request path and rename the feature honestly to "full-context injection" (recommended — it's faster, cheaper, and more accurate at this scale), or **(b)** implement real RAG: populate `ContextVector` on write, then cosine-rank chunks at query time. Option (b) is more impressive in a report *if* you have time; option (a) is defensible and takes ten minutes. **Do not leave it as-is**, where you pay for an embedding you throw away — that is the version an examiner will call out.

### 1.16 ✅ **DONE** — Login and Signup authenticated everyone

Found while fixing the above. Both auth pages wrapped their API call in a `try/catch` whose `catch` block **fabricated a local session**:

```js
} catch (err) {
  console.warn('API login error, using client authentication fallback...');
  const customUser = { _id: `usr-${Date.now()}`, name: formData.email.split('@')[0],
                       email: formData.email, role: 'organizer' };
  executeLoginSuccess(customUser);   // token defaults to 'demo-test-token-12345'
}
```

Consequences:

- **Any email and any password signed in** whenever the API was unreachable or rejected the credentials. There was no real authentication gate on the frontend at all.
- **Signup hit this path every single time**, because the role selector sent `'organizer'` / `'vendor'` — values not in the `User` schema enum — so the API always returned a validation error. No account was ever actually created through the UI.
- The fabricated token `'demo-test-token-12345'` fails every backend check, so the "logged in" user then got 401s from every subsequent request.

Both now fail closed with a real error toast. The signup role selector maps its labels onto `customer` / `provider`, and since `/auth/register` issues no tokens, signup now calls `/auth/login` immediately afterwards to obtain a real session.

The quick-login demo buttons had the same problem plus credentials (`admin@smartie.io` / `admin123`) that **exist nowhere in the seed data**. They now sign in through the real API using the accounts `scripts/seedData.js` actually creates.

### 1.17 ✅ **DONE** — Authorization failures returned 500

Services threw bare `new Error('Access denied to this booking.')`. The global handler reads `err.statusCode`, which a plain `Error` does not have, so it fell through to **500**. A client could not distinguish "you are not allowed" from "the server crashed", and the negotiation access check looked like a bug.

Added `server/utils/AppError.js` with `BadRequestError` / `UnauthorizedError` / `ForbiddenError` / `NotFoundError` / `ConflictError`, and converted every throw in `authService`, `bookingService`, and `eventService`. Verified: an outsider reading someone else's booking now gets **403**, not 500.

---

## Phase 2 — Wire Up What's Already Built (~8 hours) 💎 **Best value per hour**

Roughly 2,000 lines of finished, working UI are sitting orphaned. The backends exist. Only the imports are missing.

### 2.1 Build the real SuperAdmin dashboard

`SuperAdminDashboard.jsx` is currently four lines that render `<AdminPanel />`. Meanwhile seven purpose-built governance widgets exist and are imported by nothing:

| Component | Backing endpoint | Status |
|---|---|---|
| `EnterpriseAnalytics` | `GET /super-admin/stats` | ✅ ready |
| `GlobalAuditLogs` | `GET /super-admin/logs` | ✅ ready |
| `FraudDetectionCenter` | `GET /super-admin/fraud-risks` | ✅ ready (after §1.10) |
| `ProviderGovernance` | `POST /super-admin/user-governance` | ✅ ready |
| `DisputeResolutionCenter` | `PUT /admin/bookings/:id/resolve-dispute` | ✅ ready |
| `PlatformPulseFeed` | socket `notification` stream | ✅ ready |
| `SystemHealthMonitor` | *needs* `GET /health` | ⚠️ add endpoint |

Compose them into a tabbed console:
```jsx
const TABS = [
  { id: 'analytics',  label: 'Analytics',  icon: BarChart3, Component: EnterpriseAnalytics },
  { id: 'fraud',      label: 'Fraud',      icon: ShieldAlert, Component: FraudDetectionCenter },
  { id: 'disputes',   label: 'Disputes',   icon: Gavel,     Component: DisputeResolutionCenter },
  { id: 'governance', label: 'Governance', icon: Users,     Component: ProviderGovernance },
  { id: 'audit',      label: 'Audit Log',  icon: ScrollText,Component: GlobalAuditLogs },
  { id: 'health',     label: 'Health',     icon: Activity,  Component: SystemHealthMonitor },
];
```
Add the missing health endpoint in `server/index.js`:
```js
app.get('/api/v1/health', (req, res) => res.json({
  success: true,
  uptime: process.uptime(),
  db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  memory: process.memoryUsage().heapUsed,
  timestamp: new Date().toISOString()
}));
```

**Payoff:** "SuperAdmin governance & fraud detection" goes from a claim in your report to a screen you can demo. This is the biggest single upgrade available to you.

### 2.2 Wire the Dashboard widgets

`TrustScoreWidget`, `EventReadiness`, `BudgetAnalyzer`, `TimelineBoard`, and `HeroAIMatchmaker` are all built and orphaned.

- `TrustScoreWidget` → `ProviderDashboard.jsx` (data already on `user.trustScore`)
- `EventReadiness` → `EventDetail.jsx` for owners (`GET /events/:id/readiness` exists)
- `HeroAIMatchmaker` → `CustomerDashboard.jsx` (`POST /ai/rfp` exists)
- `TimelineBoard` → `CustomerDashboard.jsx` (`POST /ai/timeline` exists)
- `BudgetAnalyzer` → `BudgetTracker.jsx` (`POST /ai/budget/analyze` exists)

### 2.3 Parse the AI action protocol

`aiService.js` instructs the model to emit `[ACTION_EVENT_CREATE]: {...}` and `[ACTION_REPORT_GENERATE]: {...}` blocks. Nothing parses them, so the feature is invisible.

In `AIConcierge.jsx`, extract the block, strip it from the displayed text, and render a confirmation card:

```jsx
const ACTION_RE = /\[ACTION_(\w+)\]:\s*(\{[\s\S]*?\})/;

function parseAction(reply) {
  const m = reply.match(ACTION_RE);
  if (!m) return { text: reply, action: null };
  try {
    return { text: reply.replace(ACTION_RE, '').trim(), action: { type: m[1], payload: JSON.parse(m[2]) } };
  } catch {
    return { text: reply.replace(ACTION_RE, '').trim(), action: null };
  }
}
```
Then render "Smartie wants to create the service **Premium Wedding Package** — $2,500. [Confirm] [Cancel]", where Confirm `POST`s to `/events`. **An AI that takes real actions with human confirmation is a genuinely strong FYP demo moment** — far more compelling than a chatbot that only talks.

### 2.4 Surface dispute resolution to users

`status: 'disputed'` exists in the schema and admins can resolve disputes, but **no user can raise one** — there is no endpoint and no button. Add:

- `POST /bookings/:id/dispute` (party-only, confirmed bookings only, requires a reason)
- A "Raise a dispute" action on confirmed bookings in `Bookings.jsx`
- Feed disputed bookings into `DisputeResolutionCenter`

This closes the loop on a feature your report already describes.

---

## Phase 3 — UI/UX Fixes (~16 hours) 🎨

### 3.1 🔴 Fix dark mode — it is currently broken in a visible way

`ThemeContext` defaults to **`'dark'`** and adds `.dark` to `<html>`. But:
- `App.jsx` hardcodes `bg-[#F8F9FA] text-[#111827]` on the shell — always light
- `index.css` hardcodes `body { @apply bg-[#FAFAFC] text-[#0F172A] }` — always light
- Only **26** `dark:` variants exist across the entire codebase
- `tailwind.config.js` never sets `darkMode: 'class'`, so `dark:` variants follow the OS, not your toggle
- Meanwhile `NegotiationPage.jsx` is hardcoded *dark* (`bg-ink text-white`)

**Net effect: a first-time visitor gets a light shell wrapping a black negotiation page, and the theme toggle appears to do nothing.**

Fix properly with CSS custom properties — one source of truth, no `dark:` variant sprawl:

```js
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: { extend: { colors: {
    bg:      'rgb(var(--bg) / <alpha-value>)',
    surface: 'rgb(var(--surface) / <alpha-value>)',
    border:  'rgb(var(--border) / <alpha-value>)',
    fg:      'rgb(var(--fg) / <alpha-value>)',
    muted:   'rgb(var(--muted) / <alpha-value>)',
    brand:   'rgb(var(--brand) / <alpha-value>)',
    success: 'rgb(var(--success) / <alpha-value>)',
    danger:  'rgb(var(--danger) / <alpha-value>)',
  }}}
}
```
```css
/* index.css */
:root {                      /* light */
  --bg: 250 250 252;  --surface: 255 255 255;  --border: 226 232 240;
  --fg: 15 23 42;     --muted: 100 116 139;
  --brand: 79 70 229; --success: 16 185 129;   --danger: 239 68 68;
}
.dark {                      /* dark */
  --bg: 15 17 24;     --surface: 24 27 37;     --border: 39 43 56;
  --fg: 241 245 249;  --muted: 148 163 184;
  --brand: 129 140 248; --success: 52 211 153; --danger: 248 113 113;
}
body { @apply bg-bg text-fg antialiased; }
```
Then sweep the codebase replacing hardcoded hexes with `bg-surface`, `text-fg`, `text-muted`, `border-border`. **Both themes then work everywhere with zero `dark:` variants.**

Also change the default from `'dark'` to the OS preference:
```js
const [theme, setTheme] = useState(() =>
  localStorage.getItem('theme') ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
);
```

### 3.2 🔴 Consolidate three competing design systems

The project currently carries **three unrelated palettes** simultaneously:
- `index.css` `:root` — ink/paper/emerald/gold/coral, Fraunces serif
- `tailwind.config.js` — "Adyen" indigo `#4F46E5`
- `DynamicNavbar.jsx` — "NutsDev" green `#0ABF53` on navy `#00112C`

…spread across `index.css`, `App.css`, `feature-styles.css`, `gallery-styles.css`, `mega-menu.css`, `ChatModal.css`, and `ProviderDashboard.css`.

An inconsistent visual language is the fastest way to make good work look unfinished. **Pick one palette** (the indigo/emerald system is the most complete), define it once as tokens per §3.1, and delete the other two. Merge the seven CSS files into `index.css` + at most one `components.css`.

Then extract shared primitives instead of repeating utility strings — you have ~160 hand-styled buttons:
```
client/src/components/ui/{Button,Card,Input,Badge,Modal,Skeleton,EmptyState}.jsx
```

### 3.3 ✅ **DONE** — Add real route guards

Every protected route is written `user ? <Page/> : <Home/>`. Two problems:
1. An unauthenticated visitor at `/bookings` silently lands on the marketing homepage — no explanation, no login prompt, no return-to-destination.
2. **There is no role check on any route.** A logged-in customer can navigate to `/admin/users` and the admin panel fully renders; only the API calls fail, leaving a broken-looking screen full of errors.

```jsx
// components/ProtectedRoute.jsx
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ roles }) {
  const { user, isAuthenticated } = useSelector(s => s.auth);
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
```
```jsx
<Route element={<ProtectedRoute />}>
  <Route path="/bookings"  element={<Bookings />} />
  <Route path="/tickets"   element={<TicketWallet />} />
  <Route path="/settings"  element={<Settings />} />
</Route>
<Route element={<ProtectedRoute roles={['provider','admin']} />}>
  <Route path="/leads"     element={<Leads />} />
  <Route path="/revenue"   element={<Revenue />} />
  <Route path="/services"  element={<Services />} />
  <Route path="/portfolio" element={<PortfolioManager />} />
</Route>
<Route element={<ProtectedRoute roles={['admin','superadmin']} />}>
  <Route path="/admin/users" element={<AdminPanel />} />
</Route>
```
In `Login.jsx`, honour the return destination:
```js
navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
```

### 3.4 🟠 Fix mobile navigation

`DynamicNavbar.jsx` mobile menu links are:
```jsx
<a href={link.path} onClick={() => { setMobileMenuOpen(false); navigate(link.path); }}>
```
`onClick` never calls `preventDefault()`, so the browser follows the `href` **and** React Router navigates — producing a **full page reload** on every mobile nav tap. The whole SPA re-boots, auth re-checks, and it feels broken.

```jsx
<Link to={link.path} onClick={() => setMobileMenuOpen(false)} className="...">
  {link.label}
</Link>
```
Also: the mobile menu only renders auth buttons when `!user`. **A logged-in user on mobile gets a hamburger with no dashboard, bookings, or logout links.** Add the authenticated nav set and a logout action.

### 3.5 🟠 Fix the role-routing dead ends in `Dashboard.jsx`

```jsx
{(user.role === 'customer' || user.role === 'organizer') && <CustomerDashboard/>}
{(user.role === 'provider' || user.role === 'vendor')    && <ProviderDashboard/>}
{user.role === 'attendee' && <AttendeeDashboard/>}
```
`organizer`, `vendor`, and `attendee` are not in the `User` schema enum — those branches are unreachable. Worse, **if a role somehow doesn't match, the user gets a completely blank page** with no message.

```jsx
const DASHBOARDS = {
  customer:   CustomerDashboard,
  provider:   ProviderDashboard,
  admin:      AdminDashboard,
  superadmin: SuperAdminDashboard,
};
const View = DASHBOARDS[user.role];
if (!View) return <EmptyState title="Unrecognised account type" action={{ label: 'Contact support', to: '/contact' }} />;
return <View user={user} />;
```

### 3.6 🟠 Standardise loading, empty, and error states

Only 22 of 38 pages track a loading state; only 3 have an empty state. Users currently see blank regions and cannot tell "still loading" from "nothing here" from "it failed."

Adopt one pattern everywhere:
```jsx
if (loading)      return <SkeletonList count={6} />;
if (error)        return <ErrorState message={error} onRetry={fetchData} />;
if (!data.length) return <EmptyState
                            icon={CalendarX}
                            title="No bookings yet"
                            description="When you make an offer on an event, it will appear here."
                            action={{ label: 'Explore events', to: '/events' }} />;
return <DataList items={data} />;
```
Note the skeleton in `NegotiationPage.jsx` uses `bg-slate-800/50` on `bg-ink` — invisible in light mode. Token-driven colours (§3.1) fix that automatically.

Every empty state should offer a **next action**, not just say "nothing here."

### 3.7 🟠 Accessibility — currently well below standard

| Issue | Evidence | Fix |
|---|---|---|
| Icon-only buttons unlabelled | ~160 buttons, only **5** `aria-label`s | Add `aria-label` to every icon-only control |
| Missing alt text | 2 of 11 `<img>` lack `alt` | Add descriptive `alt`; `alt=""` for decorative |
| No focus indicators | **0** occurrences of `focus-visible` | Add a global ring; never `outline: none` without a replacement |
| No reduced-motion support | **0** occurrences of `prefers-reduced-motion`, with GSAP + Framer Motion + a canvas particle field running constantly | Respect the OS setting |
| No skip link | — | Add "Skip to main content" |
| Modals don't trap focus | `ChatModal`, QR modals | Trap focus, close on Escape, restore focus on close |
| Colour contrast | `text-slate-500` on dark, `text-[10px]` labels | Verify ≥4.5:1 for body, ≥3:1 for large text |

```css
/* index.css */
:focus-visible { outline: 2px solid rgb(var(--brand)); outline-offset: 2px; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
```jsx
// Skip the particle canvas entirely for users who asked for less motion
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
{!reduced && <ParticleBackground />}
```
This is genuinely worth marks — accessibility is explicitly assessed in most software engineering rubrics, and almost no FYP addresses it.

### 3.8 🟠 Replace `alert()` and use the form libraries you installed

`pages/Inspiration.jsx:39` uses a native `alert()` — jarring and inconsistent with every other interaction. Replace with a toast (which now actually works after §1.1).

`react-hook-form`, `@hookform/resolvers`, and `zod` are installed on the client but **`useForm` appears in zero files**. Every form is hand-rolled `useState` with no inline validation — users submit and only then discover the error from the server.

Convert `Login`, `Signup`, `ResetPassword`, `ReviewForm`, and the service/event creation forms to react-hook-form + a Zod resolver, sharing schemas with the backend where possible. Inline field errors, disabled submit while invalid, and a spinner on the button.

### 3.9 🟡 Negotiation page UX polish

The flagship screen deserves more than it currently has:

- **Show the price delta** — "$2,500 → **$2,200** ↓ 12%". `lastPrice` is already stored and unused.
- **Suggested counters** — quick-tap chips at −5% / −10% / meet-in-the-middle. This is exactly the InDrive interaction pattern you cite as inspiration.
- **Validate the counter input** — currently a free `type="number"`; a user can submit a negative or empty price. Enforce > 0 and warn on absurd deltas.
- **Offer expiry** — real negotiation platforms time-box offers. A `expiresAt` on each history entry plus a countdown adds genuine product credibility.
- **Typing / presence indicator** — you already have the socket room; `socket.emit('typing')` is cheap and makes it feel live.
- **Confirm destructive actions** — Accept and Reject are financially binding and currently fire on a single click with no confirmation.
- **Empty history copy** — "Waiting for negotiation history…" is wrong when history is genuinely empty. Say "No offers yet — make the first move."

### 3.10 🟡 Consistency pass

- **Currency:** everything is hardcoded `$`. Given the Pakistani context of an FYP, either switch to PKR or add a currency field — and format with `Intl.NumberFormat` rather than string concatenation.
- **Dates:** mixed `toLocaleTimeString`, raw ISO strings, and `toDateString`. Standardise on one helper (`formatDate`, `formatRelative`) in `utils/format.js`.
- **Copy:** replace sci-fi API messages — "Identity established in the global registry", "Enterprise event nodes fetched successfully", "Identity node no longer active", "Security token mismatch" — with plain language. "Security token mismatch" for a wrong password is actively confusing to a user, and it is what an examiner will read in your network tab.
- **Status vocabulary:** the UI variously shows `confirmed`, `accepted`, `pending`, `negotiating`. Map schema values to user-facing labels in one place.

---

## Phase 4 — Testing (~12 hours) 🧪

Currently: **zero automated tests**. `server/package.json` literally has `"test": "echo \"Error: no test specified\" && exit 1"`. For a software engineering FYP, a test strategy is usually explicitly assessed — this is likely the largest single block of recoverable marks.

### 4.1 Backend unit + integration tests

```bash
npm i -D jest supertest mongodb-memory-server --prefix server
```
```
server/tests/
├── setup.js                    # spin up mongodb-memory-server
├── unit/
│   ├── trustScore.test.js      # the formula, per branch
│   ├── fraudRisk.test.js       # classification thresholds
│   └── validation.test.js      # every Zod schema, valid + invalid
└── integration/
    ├── auth.test.js            # register / login / refresh / reset / me
    ├── booking.test.js         # full negotiation lifecycle
    ├── rbac.test.js            # each role × each protected route
    └── ticket.test.js          # purchase → wallet → scan → duplicate scan
```

Prioritise the **negotiation lifecycle** — it is your flagship, so it deserves the most rigorous test:

```js
describe('Negotiation lifecycle', () => {
  it('rejects a counter-offer on a confirmed booking', async () => { /* ... */ });
  it('appends to negotiationHistory in order', async () => { /* ... */ });
  it('sets lastPrice to the previous offerPrice', async () => { /* ... */ });
  it('blocks a third party from reading the booking', async () => { /* ... */ });
  it('surfaces a friendly error on concurrent counter-offers', async () => { /* ... */ });
  it('refuses a booking on a vendor-blocked date', async () => { /* ... */ });
});
```
**Target: 60%+ coverage on `services/`.** Services hold your business logic, so that is where coverage means something.

### 4.2 Frontend component tests

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom --prefix client
```
Cover `ProtectedRoute` (redirects), `NegotiationPage` (turn-taking logic, optimistic rollback), and the auth forms (validation messages).

### 4.3 Promote the existing E2E script

`e2e_test.js` already exercises the real API end to end. Move it to `server/tests/e2e.js`, add `"test:e2e": "node tests/e2e.js"`, and cite it in your report — it demonstrates you tested integrated behaviour, not just units.

### 4.4 CI

`.github/workflows/ci.yml` running lint + tests on every push. A green CI badge in your README is cheap and reads as professional.

---

## Phase 5 — Production Readiness (~10 hours) 🚀

### 5.1 ✅ **DONE (client)** — Externalise configuration

The client hardcodes `http://localhost:5000` in four places. **The app cannot be deployed without editing source files** — a hard blocker and an obvious finding.

```js
// client/src/api/axios.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
// client/src/context/WebSocketContext.jsx
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
```
Add `client/.env.example`, and delete the now-redundant `apiConfig.js`.

Server side, validate env at boot in `server/config/env.js`:
```js
const { z } = require('zod');
const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
module.exports = parsed.data;
```

### 5.2 Structured logging

Replace ~40 scattered `console.log` calls with `pino` (or `winston`): levelled, JSON in production, pretty in development, request IDs correlated across a request's lifetime. Never log tokens, passwords, or full request bodies.

### 5.3 Harden the error handler

`server/middleware/errors.js` must never leak stack traces in production, and must map error classes to correct status codes. Right now services throw bare `new Error('Access denied to this booking.')`, which almost certainly surfaces as a **500** instead of a **403** — the client then can't distinguish "forbidden" from "server broke."

Introduce typed errors:
```js
class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message); this.statusCode = statusCode; this.code = code; this.isOperational = true;
  }
}
class NotFoundError   extends AppError { constructor(m='Not found')  { super(m, 404, 'NOT_FOUND'); } }
class ForbiddenError  extends AppError { constructor(m='Forbidden')  { super(m, 403, 'FORBIDDEN'); } }
class ConflictError   extends AppError { constructor(m='Conflict')   { super(m, 409, 'CONFLICT'); } }
```
and use them throughout `bookingService`, `eventService`, and `authService`.

### 5.4 Database indexes

Only `Event` has an index. Add the ones your actual query patterns need:
```js
bookingSchema.index({ vendorId: 1, status: 1, updatedAt: -1 });  // vendor dashboard
bookingSchema.index({ customerId: 1, createdAt: -1 });           // my bookings
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
reviewSchema.index({ event: 1, user: 1 }, { unique: true });     // enforce one review per user per event in the DB, not just in code
ticketSchema.index({ attendee: 1 });
auditLogSchema.index({ createdAt: -1 });
```
The unique compound index on `Review` is important: the current duplicate check is a read-then-write race.

### 5.5 Tighten security

- **Rate limits are too loose.** 100 login attempts per 15 minutes per IP is an open door for credential stuffing. Use 5–10 on `/auth/login` and `/auth/forgot-password` specifically, keeping the looser limit for the rest of `/auth`.
- **Don't leak account existence.** `login` returns "Identity not found" vs "Security token mismatch" — an attacker can enumerate registered emails. Return one generic "Invalid email or password" for both.
- **`forgot-password` returns the reset token in the HTTP response body.** That is a complete account-takeover vector: anyone can request a reset for any email and read the token straight from the response. It must only go out by email. (Keep the console log for local development, gated on `NODE_ENV !== 'production'`.)
- **Sanitise user input** — `express-mongo-sanitize` against operator injection; escape or strip HTML in `message`, `comment`, and `description` fields.
- **Harden uploads** — `multer` needs MIME-type allow-listing, a file-size cap, and randomised filenames.
- **Move tokens out of `localStorage`** — an XSS anywhere in the app steals the session. `httpOnly` cookies with a CSRF token is the correct pattern. *(Time-box this — it touches auth end to end. If time is short, document it as a known limitation with the mitigation you'd apply; examiners respect a stated, understood trade-off far more than a silent one.)*

### 5.6 🟠 Code-split the frontend bundle

The production build currently emits **a single 1.18 MB JavaScript chunk** (342 KB gzipped) and Vite warns about it:

```
dist/assets/index-D2Ht3yrP.js   1,179.78 kB │ gzip: 342.51 kB
(!) Some chunks are larger than 500 kB after minification.
```

Every visitor downloads the admin panel, the SuperAdmin console, Recharts, GSAP, and Framer Motion before they can read the homepage. On a slow campus connection during your demo, that is several seconds of blank screen.

Route-level lazy loading fixes most of it for very little effort:

```jsx
import { lazy, Suspense } from 'react';

const AdminPanel        = lazy(() => import('./pages/Admin/AdminPanel'));
const SuperAdminDashboard = lazy(() => import('./pages/Dashboard/SuperAdminDashboard'));
const Revenue           = lazy(() => import('./pages/Revenue/Revenue'));   // pulls in Recharts
const BudgetTracker     = lazy(() => import('./pages/AI/BudgetTracker'));

// wrap <Routes> once:
<Suspense fallback={<CustomLoader />}>
  <Routes>{/* ... */}</Routes>
</Suspense>
```

Prioritise the heaviest leaf routes: anything importing **Recharts** (`Revenue`, `BudgetTracker`), the admin/superadmin tree, and **GSAP** if only a few pages use it. Target: initial chunk under 300 KB gzipped. Re-run `npm run build` to confirm the warning clears.

### 5.7 Deployment

- Backend → **Render / Railway / Fly.io** (Socket.IO needs persistent connections; Vercel serverless cannot provide them)
- Frontend → **Vercel / Netlify**, with `VITE_API_URL` set for the environment
- Database → **MongoDB Atlas** (free tier), IP allow-list configured, new credential from §0.2
- Add a `Dockerfile` + `docker-compose.yml` for reproducible local setup — this is a strong signal of engineering maturity in an FYP report

---

## Phase 6 — Documentation & Report Assets (~8 hours) 📚

### 6.1 Rewrite the README as the front door

Badges (CI, licence) · one-paragraph pitch · **animated GIF of a live negotiation** · feature list · architecture diagram · quick start · env table · API summary · test instructions · deployment guide · screenshots.

Your README is the first thing an examiner opens. Make it the best-looking artefact in the repo.

### 6.2 API documentation

Add Swagger/OpenAPI:
```bash
npm i swagger-ui-express swagger-jsdoc --prefix server
```
Annotate routes with JSDoc and serve interactive docs at `/api-docs`. **An examiner being able to click through and execute your API live is a very strong demo moment**, and it costs a few hours.

### 6.3 Diagrams for the report

Generate from the real system, not from memory:
- Use-case diagram (4 actors × their capabilities)
- ER diagram (11 collections + relationships)
- Sequence diagram — the negotiation flow (adapt the ASCII version in `PROJECT_DOCUMENTATION.md` §7B)
- Component/architecture diagram
- Deployment diagram

Mermaid renders in GitHub markdown and keeps diagrams versioned with the code.

### 6.4 Reconcile the older documents

`PROJECT_OVERVIEW.md`, `docs/PRD_EVENT_MANAGEMENT_SYSTEM.md`, and `docs/SFS_EVENT_MANAGER.md` describe features that don't work as written (RAG retrieval, escrow, the SuperAdmin console). **Examiners cross-check the report against the code.** Update them, or explicitly mark items as "future work."

Delete `PROJECT_OVERVIEW.md` once `PROJECT_DOCUMENTATION.md` supersedes it — two overlapping overviews that disagree is worse than one.

### 6.5 Write an honest limitations section

Name what isn't there: no payment gateway, no escrow, no email deliverability in production, no mobile app, tokens in `localStorage`, single-region deployment. **A limitations section that pre-empts the examiner's questions consistently scores better than one that hides them.** You control the framing when you raise it first.

---

## Priority Matrix

| Task | Impact | Effort | Do it? |
|---|---|---|---|
| ~~Git baseline commit (§0.1)~~ | 🔥🔥🔥 | — | ✅ **done** |
| ~~Remove duplicate backend (§0.3)~~ | 🔥🔥 | — | ✅ **done** |
| ~~Fix ticket purchase 500 (§1.5)~~ | 🔥🔥🔥 | — | ✅ **done** |
| **Rotate the Atlas password (§0.2)** | 🔥🔥🔥 | 5 min | ⚠️ **only you can do this** |
| Mount `<Toaster />` (§1.1) | 🔥🔥🔥 | 10 min | **Right now** |
| Block superadmin self-signup (§1.2) | 🔥🔥🔥 | 5 min | **Right now** |
| Fix negotiation notes (§1.8) | 🔥🔥🔥 | 20 min | **Today** |
| Fix password reset (§1.6) | 🔥🔥🔥 | 20 min | **Today** |
| Fix 401/403 refresh mismatch (§1.7) | 🔥🔥🔥 | 30 min | **Today** |
| Fix provider earnings $0 (§1.9) | 🔥🔥 | 30 min | **Today** |
| Socket authentication (§1.4) | 🔥🔥🔥 | 2 h | Week 1 |
| Route guards + role checks (§3.3) | 🔥🔥🔥 | 2 h | Week 1 |
| Wire SuperAdmin dashboard (§2.1) | 🔥🔥🔥 | 4 h | Week 1 |
| Fix dark mode / design tokens (§3.1) | 🔥🔥 | 4 h | Week 2 |
| Loading / empty / error states (§3.6) | 🔥🔥 | 4 h | Week 2 |
| Backend test suite (§4.1) | 🔥🔥🔥 | 8 h | Week 2 |
| Accessibility pass (§3.7) | 🔥🔥 | 4 h | Week 3 |
| Config externalisation + deploy (§5.1, §5.6) | 🔥🔥 | 4 h | Week 3 |
| Swagger docs (§6.2) | 🔥 | 3 h | Week 3 |
| Payment integration | 🔥 | 12 h+ | Only with spare time — document as future work otherwise |

---

## Suggested Four-Week Schedule

**Week 1 — Make it correct.**
Phase 0 (safety net, cleanup, credential rotation) + all of Phase 1 (the fifteen defects) + §2.1 SuperAdmin console.
*Milestone: every advertised feature actually works when clicked.*

**Week 2 — Make it look professional.**
Rest of Phase 2 (wire orphaned widgets, AI actions, disputes) + Phase 3.1–3.6 (design tokens, dark mode, route guards, mobile nav, state handling).
*Milestone: a stranger can use the app without confusion.*

**Week 3 — Make it credible.**
Phase 4 (tests + CI) + Phase 3.7–3.10 (accessibility, forms, negotiation polish) + Phase 5.1–5.5.
*Milestone: green CI, meaningful coverage, deployable from a clean clone.*

**Week 4 — Make it presentable.**
Phase 5.6 (deploy) + Phase 6 (README, Swagger, diagrams, report reconciliation) + rehearse the demo.
*Milestone: a live URL, a polished README, and a demo script you've run five times.*

---

## Demo Script for the Viva

Rehearse this until it runs without hesitation. **Seed fresh data before every run** so nothing looks stale or half-populated.

1. **Landing page** → theme toggle (works in both directions after §3.1) → sign up as a customer.
2. **Explore events** → filter by category, price range, and location → open an event detail page.
3. **Make an offer** below asking price with a note.
4. **Second browser, provider account** → live notification arrives with no refresh.
5. **Open the negotiation thread in both windows side by side** → counter-offer → watch it appear instantly in the other window with the note visible and the price delta shown. *This is your money shot — spend time here.*
6. **Accept** → booking confirmed, both parties notified, email fires.
7. **Purchase a ticket** → open the wallet → show the QR pass.
8. **Staff scanner** → scan → valid → scan the same ticket again → duplicate-entry rejection.
9. **AI Concierge** → "How is my business performing this month?" → real numbers from real data → then "Create a premium wedding photography package for $2,500" → action card appears → confirm → the service is created (§2.3).
10. **Leave a review** → show the trust score updating.
11. **SuperAdmin login** → fraud detection scores, audit log, dispute resolution, live platform pulse (§2.1).
12. **Close on engineering:** `npm test` green, Swagger at `/api-docs`, the CI badge, and the architecture diagram.

**Have ready for the inevitable questions:** why negotiation over fixed pricing; how you prevent two simultaneous counter-offers from corrupting state (optimistic concurrency — a great answer, make sure you can explain it); how the trust score is computed and why those weights; what the AI actually does and what "full-context injection" means versus RAG; and what you would build next with three more months.

---

## Final Note

Be candid about scope in your report. The strongest FYP defence is not "everything works perfectly" — no examiner believes that. It is **"here is exactly what works, here is what I deliberately left out and why, and here is how I verified the difference."** You now have that inventory in `PROJECT_DOCUMENTATION.md` §11, backed by tests once Phase 4 is done.

The engineering instincts in this codebase are good. Finish the last 20%, and it will show.
