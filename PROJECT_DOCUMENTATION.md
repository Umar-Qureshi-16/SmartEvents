# SmartEvents — Complete Project Documentation

> **Project type:** Final Year Project (FYP-2), BS Software Engineering
> **Stack:** MongoDB · Express.js · React 19 (Vite) · Node.js (MERN) + Socket.IO + LLM services
> **Core differentiator:** InDrive-style two-sided real-time price negotiation for event services, plus an AI business concierge ("Smartie").
> **Document status:** Written from a full read of the source on 2026-08-12, and updated after the Phase 0/1 repair work. Feature statuses in §11 reflect what the code *actually does*, not what earlier docs claimed. Entries marked *(fixed)* record a defect that existed and has since been repaired — useful material for a report's testing chapter.

---

## Table of Contents

1. [What the Project Does](#1-what-the-project-does)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Roles & Permissions](#5-roles--permissions)
6. [Data Model](#6-data-model)
7. [Core Workflows](#7-core-workflows)
8. [Complete API Reference](#8-complete-api-reference)
9. [Real-Time (WebSocket) Layer](#9-real-time-websocket-layer)
10. [AI Subsystem](#10-ai-subsystem)
11. [Feature Inventory with Honest Status](#11-feature-inventory-with-honest-status)
12. [Frontend Route Map](#12-frontend-route-map)
13. [Setup & Running](#13-setup--running)
14. [Environment Variables](#14-environment-variables)
15. [Dead / Removable Code Manifest](#15-dead--removable-code-manifest)

---

## 1. What the Project Does

SmartEvents is a **two-sided marketplace for event services**. It connects two primary groups:

- **Customers** (people planning a wedding, corporate event, concert, birthday) who need services.
- **Providers / Vendors** (venues, caterers, decorators, photographers, musicians, makeup artists) who sell those services.

Most existing event platforms use **fixed pricing** — the vendor posts a price, the customer takes it or leaves it. SmartEvents' thesis is that event services are *inherently negotiable* (they vary by date, guest count, season, and vendor idle capacity), so the platform makes negotiation a **first-class, real-time, auditable feature** rather than something that happens off-platform over WhatsApp.

### The three pillars

| Pillar | What it solves |
|---|---|
| **1. Real-time negotiation engine** | Customer makes an offer → provider counters → customer counters → either party accepts or rejects. Every step is timestamped and stored as an immutable negotiation history, streamed live to both browsers over WebSockets. |
| **2. Trust & governance layer** | A computed `trustScore` per provider (driven by completions, cancellations, no-shows, disputes, and review ratings), plus a fraud risk engine, audit logging, dispute resolution, and admin/superadmin governance controls. |
| **3. AI concierge ("Smartie")** | An LLM layer that reads the user's real business data and answers questions, generates structured RFPs from plain-English event descriptions, builds planning timelines, and analyses budgets. |

Supporting these are: an event marketplace with filtering/pagination, a vendor marketplace with portfolios and packages, a provider availability calendar, a digital ticket wallet with QR passes, an on-site QR check-in scanner, reviews gated behind confirmed bookings, and a persistent notification system.

---

## 2. System Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                      CLIENT — React 19 (Vite, :5173)                  │
│                                                                       │
│  Redux Toolkit (auth, settings)   React Router v7   Framer Motion     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────────┐ │
│  │ Axios inst. │  │ WebSocket    │  │ ThemeContext / Toaster        │ │
│  │ + JWT       │  │ Context      │  │                               │ │
│  │ interceptor │  │ (socket.io)  │  │                               │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────────────────────────┘ │
└─────────┼────────────────┼────────────────────────────────────────────┘
          │ HTTPS/REST     │ WebSocket
          │ /api/v1/*      │ (rooms)
┌─────────▼────────────────▼────────────────────────────────────────────┐
│                    SERVER — Express 5 (Node.js, :5000)                │
│                                                                       │
│  helmet · morgan · rate-limit · cors · express.json                   │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ROUTES  (13 routers, all under /api/v1)                          │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ MIDDLEWARE  verifyToken · authorize(...roles) · verifySuperAdmin  │ │
│  │             validate(zodSchema) · multer upload · errorHandler    │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ CONTROLLERS  (thin — HTTP shape only)                            │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ SERVICES  auth · booking · event · notification · socketManager  │ │
│  │           aiService · trustScore · fraudRisk · qr · mail · cache  │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ MODELS (Mongoose)  User · Event · Booking · Service · Review      │ │
│  │                    Ticket · Notification · AuditLog · VendorProfile│ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────┬──────────────────────┬───────────────────────┬─────────────────┘
       │                      │                       │
┌──────▼──────┐      ┌────────▼────────┐     ┌────────▼─────────┐
│  MongoDB    │      │  Groq API       │     │  Google Gemini   │
│  (Mongoose) │      │  llama-3.3-70b  │     │  embeddings-004  │
└─────────────┘      └─────────────────┘     └──────────────────┘
```

**Layering convention (backend):** `route → middleware → controller → service → model`.
Controllers only handle HTTP request/response shape; all business logic belongs in `services/`. This is followed correctly in `auth`, `booking`, and `event`. It is **not** followed in `vendor`, `review`, `admin`, and `superAdmin`, where controllers talk to models directly — see the improvement plan.

---

## 3. Technology Stack

### Frontend (`client/`)

| Concern | Library | Version |
|---|---|---|
| UI framework | React | 19.2 |
| Build tool | Vite | 8.0 |
| Styling | Tailwind CSS | 3.4 |
| State | Redux Toolkit + React-Redux | 2.12 / 9.3 |
| Routing | React Router DOM | 7.14 |
| HTTP | Axios (custom instance + interceptors) | 1.16 |
| Real-time | socket.io-client | 4.8 |
| Animation | Framer Motion, GSAP | 12.38 / 3.15 |
| Charts | Recharts | 3.8 |
| Icons | lucide-react, react-icons | — |
| Forms | React Hook Form + Zod resolvers *(installed but unused — see §15.5)* | 7.80 |
| Toasts | react-hot-toast | 2.6 |

### Backend (`server/`)

| Concern | Library | Version |
|---|---|---|
| Framework | Express | 5.2 |
| ODM | Mongoose | 9.6 |
| Real-time | socket.io | 4.8 |
| Auth | jsonwebtoken + bcrypt | 9.0 / 6.0 |
| Validation | Zod | 4.4 |
| Security | helmet, express-rate-limit | 8.1 / 8.5 |
| Logging | morgan | 1.10 |
| Uploads | multer | 2.2 |
| Email | nodemailer | 9.0 |
| QR | qrcode | 1.5 |
| Caching | node-cache | 5.1 |
| LLM | groq-sdk (`llama-3.3-70b-versatile`) | 1.2 |
| Embeddings | @google/generative-ai (`text-embedding-004`) | 0.24 |

---

## 4. Directory Structure

```text
SmartEvents/
├── client/                          # React frontend
│   └── src/
│       ├── api/axios.js             # Axios instance, JWT injection, refresh-token retry queue
│       ├── components/
│       │   ├── common/              # DataTable, StatCard, Drawer, ChatWindow
│       │   ├── Dashboard/           # BudgetAnalyzer, EventReadiness, TrustScoreWidget, …
│       │   ├── layout/DynamicNavbar.jsx
│       │   ├── SuperAdmin/          # 7 governance widgets
│       │   └── reviews/             # ReviewCard, ReviewForm
│       ├── context/                 # WebSocketContext, ThemeContext, ToastContext
│       ├── pages/                   # 38 route-level pages, grouped by domain
│       ├── store/slices/            # authSlice, settingsSlice
│       ├── App.jsx                  # Router + providers
│       └── main.jsx                 # Root mount
│
├── server/                          # Express backend
│   ├── index.js                     # ✅ REAL entry point
│   ├── controllers/                 # 11 controllers
│   ├── middleware/                  # authMiddleware, errors, uploadMiddleware, validationMiddleware
│   ├── models/                      # 11 Mongoose schemas
│   ├── routes/                      # 13 routers
│   ├── services/                    # 11 service modules
│   ├── utils/validation.js          # Zod schemas + validate() middleware factory
│   ├── scripts/                     # seedData.js, seedSuperAdmin.js
│   └── tests/e2e.js                 # End-to-end API test harness (npm run test:e2e)
│
├── docs/                            # PRD + SFS academic documents
├── PROJECT_DOCUMENTATION.md         # This file
└── IMPROVEMENT_PLAN.md              # Prioritised roadmap to industry standard
```

> A legacy duplicate backend previously sat at `server/src/` ("EventFlow"). It was removed on 2026-08-12 — see §15.1.

---

## 5. Roles & Permissions

Four roles are defined in the `User` schema enum: `customer`, `provider`, `admin`, `superadmin`.

| Capability | customer | provider | admin | superadmin |
|---|:---:|:---:|:---:|:---:|
| Browse events & vendors (public) | ✅ | ✅ | ✅ | ✅ |
| Create booking offer | ✅ | — | — | — |
| Counter-offer / accept / reject | ✅ | ✅ | — | — |
| Create/edit/delete own events | — | ✅ | ✅ | — |
| Manage vendor profile & service packages | — | ✅ | — | — |
| Block/unblock calendar dates | — | ✅ | — | — |
| Purchase ticket & view wallet | ✅ | ✅ | ✅ | ✅ |
| Scan tickets (check-in) | ✅ | ✅ | ✅ | ✅ |
| Leave a review (confirmed booking only) | ✅ | — | — | — |
| List/ban users, change roles, verify vendors | — | — | ✅ | ✅ |
| Resolve booking disputes | — | — | ✅ | ✅ |
| View audit logs | — | — | ✅ | ✅ |
| Fraud risk scoring, platform stats, governance | — | — | — | ✅ |

**Enforcement mechanism:** three middlewares in `server/middleware/authMiddleware.js`:

- `verifyToken` — extracts `Bearer <jwt>`, verifies signature, attaches `req.user = { id, role }`.
- `authorize(...roles)` — 403s unless `req.user.role` is in the allowed list.
- `verifySuperAdmin` — 403s unless role is exactly `superadmin`.

> ⚠️ Roles referenced in the frontend but **not** in the schema enum: `organizer`, `vendor`, `attendee`. `Dashboard.jsx` branches on them, so those branches are unreachable. Also note the ticket routes have no role restriction at all.

---

## 6. Data Model

### `User`
| Field | Type | Notes |
|---|---|---|
| `name`, `email` (unique), `password` | String | `password` has `select: false` |
| `role` | enum | `customer` \| `provider` \| `admin` \| `superadmin` |
| `trustScore` | Number | 0–100, computed by `trustScoreService` |
| `analytics` | Object | `totalBookings`, `completedEvents`, `cancellationRate`, `averageRating` |
| `status` | enum | `active` \| `restricted` \| `banned` |
| `businessDetails` | Object | `companyName`, `portfolio[]`, `verified` |
| `favorites` | ObjectId[] | Refs `User` (vendor's user id) — the wishlist |
| `resetPasswordToken`, `resetPasswordExpires` | String / Date | 15-minute expiry |

### `VendorProfile`
`userId` (ref User) · `businessName` · `description` · `category` (`venue`|`catering`|`decoration`|`photography`|`music`|`makeup`) · `location` · `packages[]` · `portfolioImages[]` · `blockedDates[]` · `rating` · `earnings`

### `Event`
`title` · `description` · `category` (`Wedding`|`Corporate`|`Concert`|`Birthday`|`Conference`|`Exhibition`) · `price` · `date` · `location` · `capacity` · `image` · `status` (`upcoming`|`ongoing`|`completed`|`cancelled`) · `createdBy` (ref User) · `averageRating` · `numberOfReviews`
Compound index on `{ status, date, category }`.

### `Booking` — the heart of the system
| Field | Type | Notes |
|---|---|---|
| `customerId`, `vendorId` | ObjectId (User) | Both required |
| `serviceId`, `eventId` | ObjectId | Optional — booking can target an event listing *or* a custom service lead |
| `eventDetails` | Object | `eventType`, `date`, `location` (all required), `budget`, `message` |
| `status` | enum | `pending` → `negotiating` → `confirmed` \| `rejected` \| `cancelled` \| `completed` \| `disputed` \| `no_show` |
| `offerPrice` | Number | **Current live offer on the table** |
| `lastPrice` | Number | Previous offer, for delta display |
| `cancelledBy` | ObjectId | Used by trust-score penalties |
| `disputeOutcome` | enum | `refunded_customer` \| `released_vendor` |
| `negotiationHistory[]` | Array | `{ price, message, offeredBy, timestamp }` — append-only audit trail |

Uses `{ timestamps: true, optimisticConcurrency: true }` — Mongoose version key guards against two parties countering simultaneously (a `VersionError` is caught and surfaced as "please refresh").

### `Service`
Provider's sellable package, owned by a `VendorProfile` (`vendorId` refs **VendorProfile**, not User).

### `Review`
`event` · `user` · `rating` (1–5) · `comment`. Creating one requires a **confirmed booking** for that event, and one review per user per event.

### `Ticket`
`event` · `attendee` · `ticketType` · `ticketNumber` (unique) · `qrCodeData` · `price` · `status` (`active`|`checked_in`|`refunded`|`cancelled`) · `checkInTime` · `checkedInBy`

> ✅ Two conflicting `Ticket` schemas previously existed — `server/models/Ticket.js` and `server/src/models/Ticket.js` — both registering the Mongoose model name `Ticket`, with the winner decided by `require` order. Consolidated into a single schema on 2026-08-12. See §15.1.

### `Notification`
`recipient` · `title` · `message` · `type` (`booking`|`chat`|`counter_offer`|`system`|`payment`|`info`) · `relatedId` · `isRead` · `priority`

### `AuditLog`
`action` · `actor` · `targetType` · `targetId` · `severity` — written on superadmin governance actions.

### `ContextVector`
Intended RAG vector store. Currently **not written to or read from** — the AI runs in "full-context" mode instead.

---

## 7. Core Workflows

### A. Authentication & session

```
1. POST /auth/register  → Zod validates → bcrypt hash (10 rounds) → User saved
2. POST /auth/login     → bcrypt.compare → issue accessToken (1d) + refreshToken (7d)
3. Client stores both in localStorage; Redux authSlice holds them in memory
4. Axios request interceptor injects: Authorization: Bearer <accessToken>
5. On app boot, App.jsx calls GET /auth/me to rehydrate the user object
6. On 401, the Axios response interceptor:
     - queues concurrent failed requests
     - calls POST /auth/refresh once
     - replays the queue with the new token
     - dispatches logout() if refresh fails
7. Password reset: POST /auth/forgot-password → crypto random token, 15-min expiry
                   POST /auth/reset-password  → verify token → bcrypt rehash
```

### B. The negotiation engine (the flagship feature)

```
CUSTOMER                          SERVER                          PROVIDER
    │                               │                                │
    │─ POST /bookings ─────────────▶│                                │
    │  { eventId, offerPrice, msg } │                                │
    │                               │─ resolve vendorId from event   │
    │                               │─ check vendor blockedDates ────│
    │                               │─ create Booking(status:pending)│
    │                               │  + negotiationHistory[0]       │
    │                               │─ Notification row ────────────▶│
    │                               │─ socket emitToUser(vendorId) ─▶│  🔔 live
    │                               │─ nodemailer email ────────────▶│  ✉️
    │                               │                                │
    │  ┌────────── BOTH OPEN /negotiate/:bookingId ──────────────┐   │
    │  │  socket.emit('join-negotiation', bookingId)             │   │
    │  └─────────────────────────────────────────────────────────┘   │
    │                               │                                │
    │                               │◀──── POST /bookings/:id/negotiate
    │                               │      { price, message }        │
    │                               │─ guard: not confirmed/rejected │
    │                               │─ lastPrice = offerPrice        │
    │                               │─ offerPrice = new price        │
    │                               │─ push to negotiationHistory[]  │
    │                               │─ optimistic-concurrency save   │
    │◀─ socket 'offer-countered' ───│                                │
    │  🔔 toast + refetch           │                                │
    │                               │                                │
    │─ PUT /bookings/:id/accept ───▶│                                │
    │                               │─ status = 'confirmed'          │
    │                               │─ socket 'offer-accepted' ─────▶│
    │                               │─ notification + email ────────▶│
```

**Turn-taking:** the frontend computes whose turn it is by inspecting the last entry in `negotiationHistory` — if the last offer came from you, the action panel is replaced by a "Waiting for other party" spinner. If there is no history yet, it is the provider's turn.

**Optimistic UI:** `NegotiationPage.jsx` applies the state change immediately, then rolls back to the snapshot if the request fails.

### C. Ticketing & on-site check-in

```
1. Customer: POST /tickets/purchase { eventId, ticketType, price }
   → ticketNumber = TKT-<timestamp>-<4 random digits>
   → qrCodeData = JSON { ticketNumber, eventId, attendeeId, issuedAt }
   → Ticket saved with status 'active'
2. Customer opens /tickets (Digital Pass Wallet) → renders QR per ticket
3. Staff opens /staff/scanner → POST /tickets/scan { ticketNumber }
   → if not found              → 404 "Invalid ticket code"
   → if already 'checked_in'   → 400 "DUPLICATE ENTRY DETECTED at <time>"
   → else                      → status='checked_in', checkInTime, checkedInBy
```

### D. Trust score recalculation

Triggered when a booking reaches `completed` / `cancelled` / `no_show`, when a dispute is resolved, and when a review is created.

```
score = 100 (baseline)
      + 3  × completed bookings
      − 5  × bookings cancelled by this provider
      − 10 × disputes resolved as 'refunded_customer'
      − 8  × no-shows
      + 2  per 5-star review
      + 1  per 4-star review
score = clamp(score, 0, 100)
```

### E. Review gate

A review can only be created if the requester has a `confirmed` booking for that event, and has not already reviewed it. On creation, the event's `averageRating` and `numberOfReviews` are recomputed and the provider's trust score is refreshed.

### F. Governance & fraud

```
superadmin → GET  /super-admin/stats        → users, active bookings, revenue, disputes
           → GET  /super-admin/logs         → last 50 audit entries
           → GET  /super-admin/fraud-risks  → risk score per provider (LOW/MODERATE/HIGH/CRITICAL)
           → POST /super-admin/user-governance { userId, action } 
                  → status = banned|restricted
                  → AuditLog written (severity: critical)
                  → socket 'account_status_change' pushed to that user
admin      → PUT  /admin/bookings/:id/resolve-dispute { resolution }
                  → refunded_customer → booking cancelled
                  → released_vendor   → booking completed
                  → trust score recalculated
```

---

## 8. Complete API Reference

Base URL: `http://localhost:5000/api/v1`
Auth column: 🔓 public · 🔐 any logged-in user · 👤 customer · 🏪 provider · 🛡️ admin · 👑 superadmin

### Auth — `/auth`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | 🔓 | Create account (Zod-validated) |
| POST | `/login` | 🔓 | Returns `{ token, refreshToken, user }` |
| POST | `/refresh` | 🔓 | Exchange refresh token for new access token |
| POST | `/logout` | 🔓 | Stateless acknowledgement |
| GET | `/me` | 🔐 | Current user profile |
| POST | `/forgot-password` | 🔓 | Generate 15-min reset token |
| POST | `/reset-password` | 🔓 | Consume token, set new password |
| GET | `/favorites` | 🔐 | Wishlisted vendor profiles |
| POST | `/favorites` | 🔐 | Add vendor to wishlist |
| DELETE | `/favorites/:vendorId` | 🔐 | Remove from wishlist |

*Rate limit: 100 requests / 15 min per IP on this whole namespace.*

### Events — `/events`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | 🔓 | List with filters: `page`, `limit`, `category`, `status`, `date`, `minPrice`, `maxPrice`, `location`, `search`, `sortBy` (`price_asc`\|`price_desc`\|`date`). Returns `{ events, meta:{total,page,limit,totalPages} }` |
| GET | `/:id` | 🔓 | Single event, `createdBy` populated |
| GET | `/organizer/my-events` | 🏪🛡️ | Events owned by requester |
| GET | `/:id/readiness` | 🔐 | 0–100 completeness score + 5 named checks |
| POST | `/` | 🏪🛡️ | Create (multipart, `image` field) |
| PUT | `/:id` | 🏪🛡️ | Update (owner only) |
| DELETE | `/:id` | 🏪🛡️ | Delete (owner or admin) |

### Bookings & Negotiation — `/bookings`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | 👤 | Create booking + first offer |
| GET | `/my` | 👤 | Customer's bookings |
| GET | `/organizer` | 🏪🛡️ | All bookings for this vendor |
| GET | `/organizer/dashboard` | 🏪🛡️ | Leads + active bookings + earnings analytics |
| GET | `/:id` | 🔐 | Single booking (party-scoped) |
| POST | `/:id/negotiate` | 🔐 | Submit counter-offer |
| PUT | `/:id/accept` | 🔐 | Confirm |
| PUT | `/:id/reject` | 🔐 | Reject |
| PUT | `/:id/cancel` | 🔐 | Cancel |

### Vendor — `/vendor`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET / POST | `/profile` | 🏪 | Read / upsert vendor profile |
| GET | `/profile/:id` | 🔓 | Public vendor profile + services |
| GET / POST | `/services` | 🏪 | List / create service package |
| PUT / DELETE | `/services/:id` | 🏪 | Update / delete package |
| GET | `/dashboard` | 🏪 | Leads, active bookings, analytics |
| GET | `/calendar` | 🏪 | Blocked dates |
| POST | `/calendar/block` | 🏪 | Block a date |
| POST | `/calendar/unblock` | 🏪 | Unblock a date |

### Services — `/services`
| GET | `/match` | 🔓 | Match by `eventType`, `maxBudget`, `location` |

### Requests — `/requests`
| POST | `/` · PUT `/:id/status` · GET `/` | 🔐 | Legacy RFP/lead flow, parallel to `/bookings` |

### Reviews — `/reviews`
| POST | `/` | 🔐 | Create (requires confirmed booking) |
| GET | `/event/:eventId` | 🔓 | Reviews for an event |
| GET | `/provider` | 🏪 | Reviews across all of the provider's events |
| DELETE | `/:id` | 🔐 | Owner or admin |

### Tickets — `/tickets`
| GET | `/my` · POST `/purchase` · POST `/scan` | 🔐 | Wallet, purchase, check-in |

### Notifications — `/notifications`
| GET | `/` · PUT `/read-all` · PUT `/:id/read` | 🔐 | Inbox + read state |

### AI — `/ai`
| POST | `/query` | 🔐 | Smartie concierge chat |
| POST | `/rfp` | 🔐 | Natural language → structured RFP JSON |
| POST | `/timeline` | 🔐 | Event date → planning milestones |
| POST | `/budget/analyze` | 🔐 | Budget + services → breakdown, warnings |

### Chatbot — `/chatbot`
| POST | `/` · POST `/message` | 🔐 | Lightweight chat endpoint |

### Admin — `/admin` *(router-level `authorize('admin','superadmin')`)*
| GET | `/users` · `/stats` · `/audit-logs` | 🛡️ | Read |
| PUT | `/users/:id/role` · `/users/:id/ban` · `/users/:id/verify` | 🛡️ | Governance |
| PUT | `/bookings/:id/resolve-dispute` | 🛡️ | Dispute outcome |

### Super Admin — `/super-admin` *(router-level `verifyToken` + `verifySuperAdmin`)*
| GET | `/stats` · `/logs` · `/fraud-risks` | 👑 | Platform intelligence |
| POST | `/user-governance` | 👑 | Ban / restrict + audit log + live socket push |

*Global rate limit: 1000 requests / 15 min per IP across `/api/`.*

---

## 9. Real-Time (WebSocket) Layer

Server module: `server/services/socketManager.js`. Initialised after the Mongo connection succeeds, sharing the same HTTP server.

**Rooms**

| Room | Joined via | Purpose |
|---|---|---|
| `user_<userId>` | `join_dashboard` (emitted on socket connect) | Personal channel for notifications |
| `<bookingId>` | `join-negotiation` / `leave-negotiation` | Live negotiation thread |

**Server → client events**

| Event | Room | Payload |
|---|---|---|
| `notification` | `user_<id>` | `{ id, title, message, type, relatedId, priority, createdAt }` |
| `offer-countered` | `<bookingId>` | `{ price, message, offeredBy }` |
| `offer-accepted` | `<bookingId>` | `{ bookingId, actorId }` |
| `offer-rejected` | `<bookingId>` | `{ bookingId, actorId }` |
| `account_status_change` | `user_<id>` | `{ status }` |

**Client:** `WebSocketContext.jsx` creates one socket per authenticated session, joins the dashboard room on connect, and accumulates incoming notifications in context state. Components subscribing to negotiation events register handlers in `useEffect` and unregister them in the cleanup function.

> ✅ **Fixed 2026-08-12.** Previously neither `join_dashboard` nor `join-negotiation` authenticated the socket — any connected client could join any user's notification room or any booking's negotiation room by guessing an ID and receive live price offers. Now every connection must present a valid JWT (`io.use` handshake check), the personal room is derived from the verified token rather than client input, and `join-negotiation` confirms the caller is the booking's customer or vendor before joining.

---

## 10. AI Subsystem

Two providers are used:

- **Groq** — `llama-3.3-70b-versatile` for all generation.
- **Google Gemini** — `text-embedding-004` for embeddings.

### 10.1 Smartie concierge — `POST /ai/query`

```
query ──▶ createEmbedding(query)          [Gemini]
      ──▶ retrieveContext(...)             ← builds a context array
      ──▶ generateResponse(query, ctx, userId)
              │
              ├─ load User
              ├─ load this provider's Events
              ├─ load Bookings and compute:
              │    total revenue, booking count, average booking value,
              │    top-performing package
              ├─ apply rule injections:
              │    RULE 1 — zero services   → tell them to create a package
              │    RULE 2 — zero bookings   → suggest a 10% price drop
              │    RULE   — "report"/"analysis"/"performance" in query
              │               → switch to formal analytical tone
              └─ Groq chat completion (temp 0.5, max 1024 tokens)
                  system prompt = persona + live knowledge base + rules
```

The system prompt also defines an **action protocol** — the model may append a machine-readable block at the end of its reply:

- `[ACTION_EVENT_CREATE]: { "title", "type", "price", "description" }`
- `[ACTION_REPORT_GENERATE]: { "timeframe", "metrics" }`

*(The frontend does not yet parse these blocks — the hook exists but is unwired.)*

### 10.2 RFP generator — `POST /ai/rfp`
Plain-English event description → strict JSON (`response_format: json_object`, temp 0.2):
```json
{ "title": "", "theme": "", "budget": 0, "servicesRequired": [],
  "estimatedFeasibility": "High|Medium|Low", "recommendations": ["A","B"] }
```

### 10.3 Timeline generator — `POST /ai/timeline`
Event type + title + date → `[{ milestone, daysBefore, description }]` covering Venue Booking, Catering, Invitations, Logistics, Final Review.

### 10.4 Budget analyzer — `POST /ai/budget/analyze`
Total budget + service list → `{ analysis, breakdown: {category: pct}, warnings: [] }`.

**Graceful degradation:** all four endpoints fall back to a hand-written static payload if the model call fails or returns null, so the UI never shows an empty state during a demo. Groq 429s are surfaced as a friendly "capacity reached, try again" message.

> ⚠️ **Honest note for your viva:** this is described as "RAG" but it is not retrieval-augmented generation. `createEmbedding()` is called, the vector is passed into `retrieveContext()`, and then **ignored** — no cosine similarity search runs, and `ContextVector` is never populated. What actually happens is *full-context injection*: every relevant record is fetched fresh from Mongo and pasted into the prompt. That is a legitimate and arguably better architecture at this data scale — but call it what it is, or wire up real retrieval. Both options are covered in the improvement plan.

---

## 11. Feature Inventory with Honest Status

Legend: ✅ working · ⚠️ partially working / has a defect · 🔌 built but not wired into the UI · ❌ broken or missing

### Authentication & accounts
| Feature | Status | Note |
|---|---|---|
| Register / login with JWT | ✅ | bcrypt 10 rounds, Zod-validated |
| Access + refresh token rotation | ✅ *(fixed)* | Previously the server returned **403** on expired tokens while the interceptor only retries on **401**, so refresh never fired and sessions hard-expired at 1 day. Expiry is now 401; 403 is reserved for insufficient role. |
| Password reset | ✅ *(fixed)* | The controller read `newPassword` while the schema required `password`, so the reset always failed. Both names are now accepted. The token is also no longer returned in the HTTP response. |
| Role selection at signup | ✅ *(fixed)* | `signupSchema` accepted `role: 'admin' \| 'superadmin'` from the public register endpoint — anyone could self-register as superadmin. Now limited to `customer` \| `provider`. |
| Wishlist / favorites | ✅ | |

### Marketplace
| Feature | Status | Note |
|---|---|---|
| Event listing with filters, search, sort, pagination | ✅ | Well implemented in `eventService.getAllEvents` |
| Event detail page | ✅ | |
| Event CRUD with image upload | ✅ | multer, owner-scoped |
| Event readiness score | ⚠️ | Score is computed but ignores `title`; the `checks[]` array reports on fields the score doesn't use consistently |
| Vendor marketplace + public profile | ✅ *(fixed)* | When no profile was found the API returned **fabricated vendor data** ("Grand Hyatt Ballroom", stock Unsplash images, a fake 4.9 rating with 142 invented reviews). Now returns 404; demo data belongs in `seedData.js`. |
| Service package CRUD | ✅ | |
| Availability calendar (block/unblock dates) | ✅ | Enforced at booking creation |

### Negotiation (flagship)
| Feature | Status | Note |
|---|---|---|
| Create booking with initial offer | ⚠️ **open** | `bookingCreateSchema` still **requires** `eventId`, but the service also supports direct vendor/service bookings — that path remains unreachable through the API. See improvement plan §1.13. |
| Counter-offer / accept / reject | ✅ | |
| Append-only negotiation history | ✅ | |
| Live WebSocket sync between parties | ✅ | |
| Turn-taking indicator | ✅ | |
| Optimistic UI with rollback | ✅ | |
| Concurrency protection | ✅ | Optimistic concurrency + friendly VersionError message |
| **Negotiation notes display** | ✅ *(fixed)* | The backend stored the note as `message` while the UI rendered `item.note`, so every note was invisible. |
| Per-offer action badge | ✅ *(fixed)* | The UI read `item.action`, which no schema wrote, so it always rendered "proposed". The field is now on the schema and set by `bookingService`. |
| Room authorisation | ✅ *(fixed)* | Any client could join any `bookingId` room and watch other people's prices. Sockets now require a valid JWT, and `join-negotiation` verifies the caller is a party to the booking. |

### Notifications & email
| Feature | Status | Note |
|---|---|---|
| Persistent notification records | ✅ | |
| Live socket push | ✅ | |
| Notification inbox + mark read | ✅ | |
| Nodemailer transactional emails | ⚠️ | Wired on create/counter/status-change, but failures are only `console.error`'d |
| **Toast feedback across the whole app** | ✅ *(fixed)* | 30 files imported `react-hot-toast` but `<Toaster />` was **never mounted**, so every success and error toast was silently discarded. Now mounted in `App.jsx`; the unused `ToastContext` was removed. |

### Ticketing
| Feature | Status | Note |
|---|---|---|
| Purchase ticket + QR generation | ✅ *(fixed 2026-08-12)* | Previously: the ticket saved, then `Notification.create({ user: … })` violated the live schema (which requires `recipient`), throwing inside the try block → **500** on every successful purchase. Now routed through `notificationService` with the correct field, and made non-fatal so a notification failure can never fail the purchase. |
| Digital pass wallet | ✅ | |
| QR scanner check-in with duplicate detection | ✅ | Good UX messaging |
| Ticket routes role-restricted | ⚠️ **open** | Any logged-in user can still call `/tickets/scan`. The client route is now provider/admin-only, but the API is not. |

### Trust, fraud & governance
| Feature | Status | Note |
|---|---|---|
| Trust score computation | ✅ *(fixed)* | Baseline was 100 with additive increments, so nearly every provider clamped at 100 and the score carried no information. Now a weighted completion-rate + rating ratio with dispute/no-show penalties. |
| Fraud risk engine | ✅ *(fixed)* | Queried `userId` / `providerId`, neither of which exists on `Booking` (they are `customerId` / `vendorId`), so every score was 0. Now queries the real fields and adds a no-show signal. |
| Audit logging | ⚠️ | Written only on superadmin governance actions — not on bans, role changes, or dispute resolutions from `/admin` |
| Dispute resolution endpoint | 🔌 | Endpoint works; no UI reaches it |
| Admin user management panel | ✅ | |
| SuperAdmin dashboard | ❌ | `SuperAdminDashboard.jsx` just renders `<AdminPanel />`. All **7** purpose-built SuperAdmin widgets (FraudDetectionCenter, DisputeResolutionCenter, GlobalAuditLogs, EnterpriseAnalytics, PlatformPulseFeed, ProviderGovernance, SystemHealthMonitor) are orphaned — imported by nothing. |

### AI
| Feature | Status | Note |
|---|---|---|
| Smartie concierge chat | ✅ | |
| RFP generator | ✅ | With static fallback |
| Timeline generator | ✅ | With static fallback |
| Budget analyzer | ✅ | With static fallback |
| RAG retrieval | ✅ *(resolved honestly)* | The embedding was computed then discarded and `ContextVector` was never used. The wasted Gemini call is removed and the function renamed to reflect what it does: full-context injection, not retrieval. |
| Full-collection scan in AI path | ✅ *(fixed)* | `generateResponse` ran `Booking.find()` with **no filter**, loading every booking on the platform into memory and filtering in JavaScript. Now filtered in MongoDB. |
| `[ACTION_*]` protocol parsing | 🔌 | Prompt defines it; frontend never parses it |

### Provider analytics
| Feature | Status | Note |
|---|---|---|
| Revenue charts (Recharts) | ✅ | |
| Vendor dashboard earnings | ✅ *(fixed)* | `$match: { vendorId: req.user._id }` used a field the JWT payload does not carry, and `$match` does not auto-cast ObjectIds — earnings were always **$0**. |
| Booking count metric | ✅ *(fixed)* | `vendorController.getDashboard` counted `'cancelled'` bookings and labelled the result `totalBookingsCount` — the opposite of what it claimed. |
| Profile views | ✅ *(removed)* | Was hardcoded `1200` in one controller and `Math.random() * 500` in the other. Removed rather than faked; implement a real counter or leave it out. |

### Payments
| Feature | Status |
|---|---|
| Any payment or escrow integration | ❌ Not implemented. The UI copy references "escrow" and "payment", and a dead `payment.controller.js` exists in the legacy folder, but no live code touches money. |

---

## 12. Frontend Route Map

| Path | Component | Access |
|---|---|---|
| `/` | Dashboard if logged in, else Home | mixed |
| `/home`, `/inspiration`, `/contact`, `/about`, `/how-it-works`, `/pricing` | Marketing pages | public |
| `/login`, `/signup`, `/forgot-password`, `/reset-password/:token` | Auth | public |
| `/events`, `/events/:id` | ExploreEvents, EventDetail | public |
| `/vendors`, `/vendor/:id` | VendorMarketplace, VendorProfilePage | public |
| `/dashboard` | Role-switching Dashboard | auth |
| `/bookings`, `/negotiate/:bookingId` | Bookings, NegotiationPage | auth |
| `/leads`, `/services`, `/revenue`, `/calendar`, `/portfolio`, `/reviews` | Provider tools | auth |
| `/tickets`, `/staff/scanner` | Wallet, Scanner | auth |
| `/notifications`, `/settings`, `/favorites` | User | auth |
| `/budget-tracker`, `/ai-concierge` | AI tools | auth |
| `/admin/users`, `/admin/events` | AdminPanel | auth |
| `*` | NotFound | public |

> ✅ **Fixed 2026-08-12.** Protection was previously inline — `user ? <Page/> : <Home/>` — which meant an unauthenticated visitor hitting `/bookings` silently landed on the marketing homepage with no explanation and no return path, and **no route had a role check at all** (a logged-in `customer` could open `/admin/users` and watch the admin panel render, with only the API calls failing).
>
> `client/src/components/ProtectedRoute.jsx` now wraps route groups: unauthenticated users are redirected to `/login` with their intended destination preserved in router state, and `roles` gates provider-only and admin-only sections.

---

## 13. Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB (local `mongodb://127.0.0.1:27017/smart_events`, or an Atlas URI)

### Install
```bash
npm run install:all          # installs root, server, and client dependencies
```

### Configure
```bash
cd server
cp .env.example .env         # then fill in the values (see §14)
```

### Run both apps
```bash
npm run dev                  # concurrently: server on :5000, client on :5173
```

### Run individually
```bash
npm run dev --prefix server  # nodemon index.js
npm run dev --prefix client  # vite
```

### Seed
```bash
cd server
node scripts/seedData.js       # demo users, events, bookings
node scripts/seedSuperAdmin.js # superadmin account
```

### Build the frontend
```bash
npm run build --prefix client  # → client/dist
```

---

## 14. Environment Variables

Set in `server/.env` (git-ignored; a template lives at `server/.env.example`).

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no | API port (default `5000`) |
| `MONGODB_URI` | **yes** | Mongo connection string |
| `JWT_SECRET` | **yes** | Token signing key. The server now refuses to start if this is unset; it previously fell back to the literal string `'fyp-secret-key'`, letting anyone forge a superadmin token against a default deployment. |
| `ALLOWED_ORIGINS` | recommended | Comma-separated CORS whitelist (default `http://localhost:5173`) |
| `CLIENT_URL` | for email | Base URL used in password-reset links (default `http://localhost:5173`) |
| `GROQ_API_KEY` | for AI | Groq chat completions |
| `GEMINI_API_KEY` | for AI | Gemini embeddings |
| SMTP settings | for email | Consumed by `services/mailService.js` |

**Client-side:** set in `client/.env` (template at `client/.env.example`).

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | REST base, default `http://localhost:5000/api/v1` |
| `VITE_SOCKET_URL` | Socket.IO origin, default `http://localhost:5000` |

*Previously `http://localhost:5000` was hardcoded in four places and the app could not be deployed without editing source.*

---

## 15. Dead / Removable Code Manifest

> ✅ **This cleanup has been executed** (2026-08-12, commit `e61bd33`), and the defects in §11 were fixed in commit `2f35be6`. The tree went from 207 to 162 tracked files. Everything removed is recoverable from the baseline commit: `git show 3bd9f8b:<path>`.
>
> The section is retained as a record of what was removed and why — useful material for the "refactoring and code quality" part of your report.

### 15.1 Duplicate abandoned backend — `server/src/` + `server/server.js` — ✅ removed

This is an **entire earlier version of the project** ("EventFlow") with its own entry point, routes, controllers, models, and middleware. It is not the running application — `server/index.js` is. It is dangerous rather than merely untidy:

- **`vercel.json` deploys the wrong backend.** It builds `server/server.js`, which mounts `/api/auth`, `/api/events`, `/api/bids`, `/api/payments`… none of the real `/api/v1/*` routes, and never initialises Socket.IO. Any deployment from this config produces a non-functional app.
- **Duplicate Mongoose model registration.** `server/src/models/` and `server/models/` both define `Event`, `Notification`, `Review`, `Ticket`, and `User` under the same model names, guarded by `mongoose.models.X || mongoose.model('X', schema)`. Whichever module is required first wins, silently, based on `require` order in `index.js`. This is the direct cause of the broken ticket purchase (§11).
- **One file is genuinely live:** `server/routes/ticketRoutes.js` requires `server/src/controllers/ticket.controller.js`, which pulls in `server/src/models/{Ticket,Event,Notification}`. This file must be **migrated**, not deleted.

| Path | Action taken |
|---|---|
| `server/src/controllers/ticket.controller.js` | ✅ **Migrated** to `server/controllers/ticketController.js`, repointed at `server/models/`, notification bug fixed |
| `server/src/models/Ticket.js` | ✅ **Migrated** to `server/models/Ticket.js` (it is the schema the app actually uses); indexes added |
| `server/src/` (everything else — 5 controllers, 6 routes, 8 models, 2 middleware) | ✅ **Deleted** |
| `server/server.js` | ✅ **Deleted**; `vercel.json` repointed at `server/index.js` |

**Verified after removal:** all 13 routers load cleanly and `mongoose.models` contains exactly one registration per model name. The duplicate-registration hazard that broke ticket purchase is gone.

### 15.2 Root `server.js` — 🔴 credential leak — ✅ file removed, ⚠️ **password still needs rotating**

A 14-line throwaway file that hardcoded a **live MongoDB Atlas connection string including username and password**, referenced by no npm script. The file is deleted — but **deleting it does not rotate the credential**. It has existed on disk and must be treated as compromised: change that user's password in Atlas → Database Access, then update `server/.env`.

### 15.3 Development scratch files — ✅ removed

| Path | What it was |
|---|---|
| `server/debug_gemini.js`, `server/test-gemini.js`, `server/test-gemini-v2.js`, `server/test-chatbot.js` | Ad-hoc API probes |
| `server/output.txt`, `server/models_list.json` | Captured command output |
| `server/logs/error.log` | Runtime log committed into the tree |
| `client/refactor.js`, `client/refactor.cjs` | One-off codemod scripts, already applied |
| `client/README.md` | Untouched Vite starter boilerplate |
| `ensure_test_users.js` | Superseded by `server/scripts/seedData.js` |

`e2e_test.js` was **kept** — it is a real end-to-end API test harness and the closest thing this project has to a test suite. Moved to `server/tests/e2e.js` and wired to `npm run test:e2e`.

`20260730-2035-14.7026751.mp4` (12.7 MB) was **left on disk but git-ignored** — it may be your demo recording. Move it outside the project folder when you're sure.

### 15.4 Orphaned frontend components — 21 files were imported by nothing

```
components/AIAssistant.jsx              components/LiveNotifications.jsx
components/ChatButton.jsx               components/MagneticWrapper.jsx
components/NegotiationEngine.jsx        components/ScrollReveal.jsx
components/NotificationBell.jsx         components/common/ChatWindow.jsx
components/Dashboard/BudgetAnalyzer.jsx      components/Dashboard/EventReadiness.jsx
components/Dashboard/HeroAIMatchmaker.jsx    components/Dashboard/TimelineBoard.jsx
components/Dashboard/TrustScoreWidget.jsx
components/SuperAdmin/DisputeResolutionCenter.jsx   components/SuperAdmin/EnterpriseAnalytics.jsx
components/SuperAdmin/FraudDetectionCenter.jsx      components/SuperAdmin/GlobalAuditLogs.jsx
components/SuperAdmin/PlatformPulseFeed.jsx         components/SuperAdmin/ProviderGovernance.jsx
components/SuperAdmin/SystemHealthMonitor.jsx
pages/Events/EventList.jsx
```

They fell into two groups, and were treated differently:

- ✅ **Kept for wiring up (13 files):** the 7 SuperAdmin widgets and the Dashboard widgets (TrustScoreWidget, EventReadiness, BudgetAnalyzer, TimelineBoard, HeroAIMatchmaker) are *implemented features* whose backends already exist. They're the difference between "SuperAdmin dashboard is a stub" and "SuperAdmin dashboard is a real governance console." Wiring them is the single highest-value-per-hour task in this project — see improvement plan Phase 2.
- ✅ **Deleted (12 files, superseded by newer equivalents):** `EventList.jsx` (→ `ExploreEvents`), `Navbar.jsx` (→ `layout/DynamicNavbar`), `Topbar.jsx` (imported but never rendered), `AIAssistant.jsx` (→ `pages/AI/AIConcierge`), `NegotiationEngine.jsx` (→ `pages/Bookings/NegotiationPage`), `NotificationBell.jsx` (→ `pages/Notifications`), `LiveNotifications.jsx`, `ChatButton.jsx`, `ChatModal.jsx` + `.css`, `ChatWindow.jsx`, `MagneticWrapper.jsx`, `ScrollReveal.jsx`. The client build was verified passing afterwards.

### 15.5 Unused dependencies

✅ `joi` and `openai` were installed in `server/package.json` but imported nowhere (Zod and Groq are used instead) — **removed**.

⚠️ **Still outstanding:** on the client, `react-hook-form`, `@hookform/resolvers`, and `zod` are installed but never used — `useForm` appears in zero files. Either adopt them (recommended — see improvement plan §3.8) or uninstall them.

### 15.6 Version control

✅ The repository previously had **zero commits** — everything untracked on `master`, with no undo for anything. It is now baselined:

| Commit | Contents |
|---|---|
| `3bd9f8b` | Baseline snapshot — the full tree exactly as it was before any cleanup |
| `e61bd33` | The cleanup itself, plus these two documents |

Recover anything removed with `git show 3bd9f8b:<path>`.

**Still to do:** push to a private GitHub remote, and commit per logical change from here on.

---

## Appendix: Quick Reference — Where Things Live

| I want to change… | Look in… |
|---|---|
| Negotiation rules | `server/services/bookingService.js` |
| Negotiation UI | `client/src/pages/Bookings/NegotiationPage.jsx` |
| Who can call what | `server/middleware/authMiddleware.js` + each `routes/*.js` |
| Request body validation | `server/utils/validation.js` |
| Socket events | `server/services/socketManager.js` + `client/src/context/WebSocketContext.jsx` |
| AI prompts | `server/services/aiService.js` |
| Trust score formula | `server/services/trustScoreService.js` |
| Fraud scoring | `server/services/fraudRiskEngine.js` |
| Global error shape | `server/middleware/errors.js` |
| Design tokens | `client/src/index.css` (`:root`) + `client/tailwind.config.js` |
| API base URL | `client/src/api/axios.js` (hardcoded — should be an env var) |
