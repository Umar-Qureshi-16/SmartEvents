# SmartEvents — System Diagrams

Mermaid diagrams, rendered natively by GitHub. For the report, open this file
on GitHub and export each diagram, or paste the source into
[mermaid.live](https://mermaid.live) to download SVG/PNG.

Every diagram below is derived from the actual code, not from an earlier plan.

---

## 1. Use case diagram

```mermaid
graph LR
    Customer(("Customer"))
    Provider(("Provider"))
    Admin(("Admin"))
    SuperAdmin(("SuperAdmin"))

    subgraph Marketplace
        UC1["Browse events & vendors"]
        UC2["Make an offer"]
        UC3["Negotiate price"]
        UC4["Accept / reject offer"]
        UC5["Leave a review"]
        UC6["Manage favourites"]
    end

    subgraph Provider_Tools["Provider tools"]
        UC7["List service packages"]
        UC8["Respond to leads"]
        UC9["Block unavailable dates"]
        UC10["Track revenue"]
        UC11["Manage portfolio"]
    end

    subgraph Ticketing
        UC12["Purchase a pass"]
        UC13["View QR wallet"]
        UC14["Scan guests in"]
    end

    subgraph AI["AI concierge"]
        UC15["Ask Smartie"]
        UC16["Generate an RFP"]
        UC17["Plan a timeline"]
        UC18["Analyse a budget"]
    end

    subgraph Governance
        UC19["Raise a dispute"]
        UC20["Resolve a dispute"]
        UC21["Ban / restrict users"]
        UC22["Review fraud risk"]
        UC23["Read the audit ledger"]
        UC24["Monitor platform health"]
    end

    Customer --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
    Customer --> UC12 & UC13
    Customer --> UC15 & UC16 & UC17 & UC18
    Customer --> UC19

    Provider --> UC1 & UC3 & UC4
    Provider --> UC7 & UC8 & UC9 & UC10 & UC11
    Provider --> UC14 & UC15 & UC19

    Admin --> UC20 & UC21 & UC23
    SuperAdmin --> UC20 & UC21 & UC22 & UC23 & UC24
```

---

## 2. Entity relationship diagram

```mermaid
erDiagram
    USER ||--o{ EVENT : "creates"
    USER ||--o{ BOOKING : "books as customer"
    USER ||--o{ BOOKING : "receives as vendor"
    USER ||--o| VENDORPROFILE : "has"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ TICKET : "holds"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUDITLOG : "acts in"

    VENDORPROFILE ||--o{ SERVICE : "offers"

    EVENT ||--o{ BOOKING : "is booked through"
    EVENT ||--o{ REVIEW : "is reviewed in"
    EVENT ||--o{ TICKET : "admits to"

    BOOKING ||--o{ NEGOTIATION_ENTRY : "contains"
    BOOKING ||--o| TICKET : "may issue"

    USER {
        ObjectId _id PK
        string   name
        string   email UK
        string   password "bcrypt, select false"
        enum     role "customer|provider|admin|superadmin"
        int      trustScore "0-100, computed"
        enum     status "active|restricted|banned"
        object   analytics "completedEvents, averageRating, cancellationRate"
        array    favorites FK
    }

    VENDORPROFILE {
        ObjectId _id PK
        ObjectId userId FK
        string   businessName
        enum     category "venue|catering|decoration|photography|music|makeup"
        string   location
        array    portfolioImages
        array    blockedDates
        number   earnings
    }

    SERVICE {
        ObjectId _id PK
        ObjectId vendorId FK "-> VendorProfile"
        string   title
        number   price
        string   description
    }

    EVENT {
        ObjectId _id PK
        ObjectId createdBy FK
        string   title
        enum     category "Wedding|Corporate|Concert|Birthday|Conference|Exhibition"
        number   price
        date     date
        string   location
        int      capacity
        enum     status "upcoming|ongoing|completed|cancelled"
        number   averageRating
        int      numberOfReviews
    }

    BOOKING {
        ObjectId _id PK
        ObjectId customerId FK
        ObjectId vendorId FK
        ObjectId eventId FK "optional"
        ObjectId serviceId FK "optional"
        object   eventDetails "type, date, location, budget"
        enum     status "pending|negotiating|confirmed|rejected|cancelled|completed|disputed|no_show"
        number   offerPrice "current offer"
        number   lastPrice "previous offer"
        ObjectId cancelledBy FK
        enum     disputeOutcome "refunded_customer|released_vendor"
        int      __v "optimistic concurrency"
    }

    NEGOTIATION_ENTRY {
        number   price
        string   message
        enum     action "offer|counter|accepted|rejected"
        ObjectId offeredBy FK
        date     timestamp
    }

    TICKET {
        ObjectId _id PK
        ObjectId event FK
        ObjectId attendee FK
        string   ticketNumber UK
        string   qrCodeData
        enum     ticketType "Free|General|VIP|Student|Early Bird"
        enum     status "active|checked_in|refunded|cancelled"
        date     checkInTime
        ObjectId checkedInBy FK
    }

    REVIEW {
        ObjectId _id PK
        ObjectId event FK
        ObjectId user FK
        int      rating "1-5"
        string   comment
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId recipient FK
        string   title
        string   message
        enum     type "booking|chat|counter_offer|system|payment|info"
        bool     isRead
        enum     priority "low|medium|high"
    }

    AUDITLOG {
        ObjectId _id PK
        string   action
        ObjectId actor FK
        enum     targetType "user|booking|event|dispute|system"
        ObjectId targetId
        enum     severity "info|warning|critical"
        string   ipAddress
    }
```

---

## 3. Sequence diagram — the negotiation lifecycle

This is the project's core contribution, so it carries the most detail.

```mermaid
sequenceDiagram
    actor C as Customer
    participant UI as React client
    participant API as Express API
    participant DB as MongoDB
    participant WS as Socket.IO
    actor P as Provider

    Note over C,P: 1 — Opening offer
    C->>UI: Enter offer of $4,000
    UI->>API: POST /bookings {eventId, offerPrice, message}
    API->>API: Zod validation + role check (customer)
    API->>DB: Look up event, resolve vendorId
    API->>DB: Check provider blockedDates
    alt Date is blocked
        API-->>UI: 409 "Provider unavailable on that date"
    else Date is free
        API->>DB: Create Booking, history[0] = {price, message, action:"offer"}
        API->>DB: Write Notification for provider
        API->>WS: emitToUser(vendorId, "notification")
        WS-->>P: Live badge, no refresh needed
        API-->>UI: 201 Created
    end

    Note over C,P: 2 — Both parties open the thread
    C->>WS: connect (JWT in handshake)
    WS->>WS: Verify token, derive user room
    C->>WS: join-negotiation(bookingId)
    WS->>DB: Confirm caller is customer or vendor on this booking
    WS-->>C: Joined (silently ignored if not a party)
    P->>WS: join-negotiation(bookingId)

    Note over C,P: 3 — Counter-offer
    P->>API: POST /bookings/:id/negotiate {price: 4500, message}
    API->>API: Reject if already confirmed or rejected (409)
    API->>DB: lastPrice = offerPrice; offerPrice = 4500
    API->>DB: Append history[1] {action:"counter"}
    alt Both parties countered simultaneously
        DB-->>API: VersionError (optimistic concurrency)
        API-->>P: 409 "Modified by someone else — please refresh"
    else Write succeeded
        API->>WS: emitToRoom(bookingId, "offer-countered")
        WS-->>C: Toast + live price update
        API-->>P: 200 with the updated booking
    end

    Note over C,P: 4 — Settlement
    C->>API: PUT /bookings/:id/accept
    API->>DB: status = "confirmed"
    API->>WS: emitToRoom(bookingId, "offer-accepted")
    WS-->>P: Live confirmation
    API->>DB: Notification for both parties

    Note over C,P: 5 — After the event
    C->>API: POST /bookings/:id/dispute {reason}
    API->>API: Party check + status must be confirmed/completed
    API->>DB: status = "disputed"
    Note right of API: An administrator then rules on the outcome,<br/>which recalculates the provider's trust score.
```

---

## 4. Component / architecture diagram

```mermaid
graph TB
    subgraph Client["Client — React 19 + Vite"]
        Pages["Route pages<br/>(lazy-loaded)"]
        UIKit["UI primitives<br/>Button, Card, Modal, EmptyState"]
        Store["Redux Toolkit<br/>auth, settings"]
        Axios["Axios instance<br/>JWT + refresh queue"]
        WSCtx["WebSocket context<br/>authenticated handshake"]
        Theme["Theme context<br/>semantic tokens"]
    end

    subgraph Server["Server — Express 5"]
        Routes["13 routers<br/>/api/v1/*"]
        MW["Middleware<br/>verifyToken · authorize · validate · sanitize"]
        Ctrl["Controllers<br/>HTTP shape only"]
        Svc["Services<br/>business logic"]
        Models["Mongoose models"]
        Sock["socketManager<br/>JWT handshake + room authorisation"]
    end

    subgraph Services_External["External"]
        Mongo[("MongoDB")]
        Groq["Groq<br/>llama-3.3-70b"]
        Gemini["Google Gemini<br/>embeddings"]
        SMTP["SMTP<br/>nodemailer"]
    end

    Pages --> UIKit
    Pages --> Store
    Pages --> Axios
    Pages --> WSCtx
    Pages --> Theme

    Axios -->|"REST /api/v1"| Routes
    WSCtx -->|"WebSocket"| Sock

    Routes --> MW --> Ctrl --> Svc --> Models --> Mongo
    Svc --> Sock
    Svc --> Groq
    Svc --> Gemini
    Svc --> SMTP
```

---

## 5. Deployment diagram

```mermaid
graph TB
    subgraph Browser["User device"]
        SPA["React SPA"]
    end

    subgraph Static["Static host — Vercel / Netlify"]
        CDN["Built client bundle<br/>VITE_API_URL, VITE_SOCKET_URL"]
    end

    subgraph AppHost["Application host — Render / Railway / Fly.io"]
        Node["Node.js process<br/>Express + Socket.IO"]
        Note1["Persistent connections required —<br/>serverless cannot hold WebSockets open"]
    end

    subgraph Data["MongoDB Atlas"]
        DB[("Replica set<br/>IP allowlist")]
    end

    subgraph AI_Providers["AI providers"]
        G["Groq API"]
        GM["Gemini API"]
    end

    SPA -->|"HTTPS"| CDN
    SPA -->|"REST + WebSocket"| Node
    Node -->|"TLS"| DB
    Node --> G
    Node --> GM
```

---

## 6. Booking state machine

```mermaid
stateDiagram-v2
    [*] --> pending : Customer makes an offer

    pending --> negotiating : Either party counters
    negotiating --> negotiating : Further counters

    pending --> confirmed : Offer accepted
    negotiating --> confirmed : Offer accepted

    pending --> rejected : Offer declined
    negotiating --> rejected : Offer declined

    pending --> cancelled : Withdrawn
    negotiating --> cancelled : Withdrawn
    confirmed --> cancelled : Cancelled after confirmation

    confirmed --> completed : Event delivered
    confirmed --> no_show : Provider did not attend
    confirmed --> disputed : Either party escalates
    completed --> disputed : Escalated afterwards

    disputed --> cancelled : Ruled for the customer
    disputed --> completed : Ruled for the provider

    rejected --> [*]
    cancelled --> [*]
    completed --> [*]
    no_show --> [*]

    note right of confirmed
        Counter-offers are refused once
        confirmed or rejected (409).
    end note

    note right of disputed
        cancelled and no_show reduce the
        provider's trust score.
    end note
```

---

## 7. Authentication and token refresh

```mermaid
sequenceDiagram
    actor U as User
    participant UI as React client
    participant AX as Axios interceptor
    participant API as Express API

    U->>UI: Submit credentials
    UI->>API: POST /auth/login
    API->>API: bcrypt.compare
    Note right of API: Identical message for unknown email<br/>and wrong password, so the endpoint<br/>cannot enumerate accounts.
    API-->>UI: accessToken (1d) + refreshToken (7d)
    UI->>UI: Persist tokens, hydrate Redux

    Note over UI,API: Ordinary request
    UI->>AX: GET /bookings/my
    AX->>API: + Authorization: Bearer <access>
    API-->>AX: 200

    Note over UI,API: Access token expires
    UI->>AX: GET /bookings/my
    AX->>API: + expired token
    API-->>AX: 401 TOKEN_EXPIRED
    Note right of AX: 401 means "stale credential, refresh".<br/>403 is reserved for insufficient role,<br/>which must NOT trigger a refresh.
    AX->>AX: Queue concurrent failures
    AX->>API: POST /auth/refresh {refreshToken}
    API-->>AX: New access token
    AX->>API: Replay the queued requests
    API-->>UI: 200

    Note over UI,API: Refresh token also expired
    AX->>API: POST /auth/refresh
    API-->>AX: 401
    AX->>UI: dispatch(logout()) → redirect to /login
```

---

## 8. Trust score calculation

```mermaid
flowchart TD
    Start["Trigger:<br/>booking completed / cancelled / no-show,<br/>dispute resolved, or review created"] --> Count

    Count["Count concluded bookings:<br/>completed + cancelled + no_show"] --> Enough{"At least 3?"}

    Enough -->|No| Neutral["Score = 70<br/>Not enough history to judge"]
    Enough -->|Yes| Rate["completionRate = completed / total"]

    Rate --> Reviews["Average rating across the<br/>provider's events"]
    Reviews --> HasReviews{"Any reviews?"}
    HasReviews -->|No| NeutralRating["ratingScore = 0.5<br/>Unrated is not punished"]
    HasReviews -->|Yes| MapRating["ratingScore = (avg - 1) / 4"]

    NeutralRating --> Weighted
    MapRating --> Weighted

    Weighted["score = 100 x<br/>(0.55 x completionRate<br/>+ 0.35 x ratingScore<br/>+ 0.10 base)"] --> Penalties

    Penalties["Subtract:<br/>8 per dispute lost to the customer<br/>5 per no-show"] --> Clamp

    Clamp["Clamp to 0-100"] --> Persist["Persist trustScore and<br/>derived analytics on the User"]

    Neutral --> Persist
    Persist --> End["Displayed on provider profiles<br/>and in the governance console"]
```

---

## 9. AI concierge request flow

```mermaid
flowchart LR
    Q["User question"] --> Ctrl["POST /ai/query"]
    Ctrl --> Ctx["retrieveContext(userId)"]

    subgraph Assembly["Context assembly — full-context injection"]
        Ctx --> E["Provider's events"]
        Ctx --> B["Bookings filtered in MongoDB<br/>(not loaded wholesale into memory)"]
        E --> KB["Knowledge base:<br/>revenue, booking count,<br/>average value, top package"]
        B --> KB
    end

    KB --> Rules["Rule injection<br/>no services / no bookings /<br/>report requested"]
    Rules --> Prompt["System prompt<br/>persona + data + rules + action protocol"]
    Prompt --> LLM["Groq llama-3.3-70b"]

    LLM --> Parse["parseAssistantReply()"]
    Parse --> Text["Display text"]
    Parse --> Action{"[ACTION_*] block?"}

    Action -->|"No"| Done["Render reply"]
    Action -->|"Malformed or unknown"| Strip["Discard silently —<br/>never show raw JSON"]
    Action -->|"Recognised"| Card["Confirmation card"]

    Card --> Confirm{"User confirms?"}
    Confirm -->|"Yes"| Execute["POST /events<br/>(provider role required)"]
    Confirm -->|"No"| Dismiss["Dismiss"]

    Strip --> Done
    Execute --> Done
    Dismiss --> Done
```
