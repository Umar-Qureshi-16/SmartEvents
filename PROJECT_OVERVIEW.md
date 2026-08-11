# SmartEvents — Event Management & Real-time Negotiation System

SmartEvents is a specialized Web application designed for event management, featuring a custom InDrive-style real-time price negotiation engine between customers and event service providers, alongside an AI Concierge ("Smartie") powered by RAG (Retrieval-Augmented Generation) for RFP creation, budget analysis, and planning timelines.

---

## 1. Technological Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS (v3), Custom CSS files (`feature-styles.css`, `gallery-styles.css`, `mega-menu.css`)
- **Animation**: Framer Motion, GSAP
- **State Management**: Redux Toolkit (`@reduxjs/toolkit` and `react-redux`)
- **Routing**: React Router DOM (v7)
- **Networking**: Axios (with custom auth interceptors), Socket.io-client
- **Visuals/Analytics**: Recharts (for income and bookings tracking), Lucide-react / React-icons
- **Validation**: React Hook Form, Zod

### Backend
- **Framework**: Node.js, Express.js (v5)
- **Database ORM**: Mongoose (MongoDB)
- **Real-time Engine**: Socket.io
- **Security & Utilities**: Helmet, Express Rate Limit, Morgan, JWT (JsonWebTokens), Bcrypt, Multer (image uploads), QR Code, Node Cache
- **AI Orchestration**: Groq SDK (`llama-3.3-70b-versatile` for agent conversations), Google Generative AI SDK (`text-embedding-004` / `gemini-1.5-flash` for RAG)

---

## 2. Directory Structure Map

```text
SmartEvents/
├── client/                     # React Frontend App
│   ├── src/
│   │   ├── api/                # Axios instance and endpoints config
│   │   ├── assets/             # Images and vectors
│   │   ├── components/         # Reusable widgets (Navbars, UI loaders, etc.)
│   │   ├── context/            # WebSocket, Theme, and Toast Contexts
│   │   ├── pages/              # Routing pages (Home, Dashboards, Negotiation, etc.)
│   │   ├── store/              # Redux setup & Auth/Settings slices
│   │   ├── App.jsx             # Main router configuration
│   │   └── main.jsx            # React root mount
│   ├── tailwind.config.js      # Tailwind configurations
│   └── vite.config.js          # Vite configuration
│
└── server/                     # Node.js Express Backend API
    ├── controllers/            # Controller logic (Auth, AI, Bookings, Events)
    ├── middleware/             # Role validation, verification, rate limiters
    ├── models/                 # Mongoose collection schemas
    ├── routes/                 # Express API routing endpoints
    ├── services/               # Core integrations (aiService, notificationService, socketManager)
    └── index.js                # API Entry Point
```

---

## 3. Database Schema Definitions (Mongoose)

### User Model
- **Roles**: `customer` (can search events, make offers, negotiate, purchase tickets), `provider` (can create services/packages, accept/counter booking offers), `admin`, `superadmin` (access governance logs & dashboards).
- **Attributes**: name, email, password, role, trustScore (0-100), analytics (bookings, cancellations, ratings), status (`active`, `restricted`, `banned`).

### VendorProfile Model
- Associated with a provider-user.
- **Attributes**: businessName, description, category (`venue`, `catering`, `decoration`, `photography`, `music`, `makeup`), location, packages, portfolioImages, rating, earnings.

### Event Model
- Individual listings posted by providers/organizers.
- **Attributes**: title, price, description, category, date, status (`upcoming`, `ongoing`, `completed`, `cancelled`), capacity, location, image, createdBy.
- **Indexing**: Compound index on `{ status: 1, date: 1, category: 1 }`.

### Booking Model
- Handles bookings and InDrive-style price negotiation history.
- **Attributes**: customerId, vendorId, serviceId, eventId, eventDetails (eventType, date, location, budget, message), status (`pending`, `negotiating`, `confirmed`, `rejected`, `cancelled`), offerPrice (current active counter), lastPrice (previous reference), negotiationHistory (array of individual counters containing: price, note, timestamp, offeredBy).

---

## 4. Key Platform Workflows

### A. Auth Flow
1. User registers/logs in -> Server issues JWT.
2. Token saved in client `localStorage`.
3. Client Axios interceptor injects `Authorization: Bearer <token>` automatically on all API requests.
4. Express route middlewares protect endpoints via `verifyToken`, `authorize(...roles)`, and `verifySuperAdmin`.

### B. InDrive-style Price Negotiation
1. **Initiation**: Customer submits a booking request for a service with an initial `offerPrice`.
2. **Review**: Provider views booking leads inside the Provider Dashboard.
3. **Negotiation Thread**:
   - Both parties open the interactive Negotiation page.
   - Either party can Accept the current offer, Reject the booking, or propose a Counter-offer with an accompanying note.
   - Real-time updates occur via WebSockets.

### C. WebSocket Management
- Unified server-side manager: `server/services/socketManager.js`.
- **Event list**:
  - `join_dashboard`: Subscribes a user to their personal dashboard channel (`user_${userId}`) for live notices.
  - `join-negotiation`: Adds a socket client to a room defined by the specific `bookingId` string.
  - `leave-negotiation`: Unsubscribes the socket client from the room when they navigate away.
  - **Broadcast events**: `new-offer`, `offer-countered`, `offer-accepted`, `offer-rejected` broadcast updates within the respective room or user channels.

### D. AI Concierge ("Smartie")
- **Concierge Chat**: In `aiService.js`, uses a dynamic full-context assembly RAG. When a user queries `/api/v1/ai/query`, the backend pulls their services/bookings/metrics, constructs a textual prompt block, feeds it to Groq's Llama 3.3 model, and returns a natural dialogue response.
- **RFP Generator**: Turns abstract user natural language queries into a structured event RFP JSON (budget, recommended services, feasibility).
- **Timeline Generator**: Plans planning milestones (Venue Booking, Catering, Logistics) based on the event's target date.
- **Budget Analyzer**: Generates a categories percentage breakdown and identifies overspending risks.

### E. Digital Pass Wallet
- Allows customers to generate and view event passes/tickets. Each ticket is encoded with a unique QR code. A staff/organizer ticket scanner is available at `/staff/scanner` to validate check-ins.

---

## 5. Development Guidelines & Conventions
- **REST Endpoints**: Base version prefix: `/api/v1/...`.
- **CORS Config**: Currently accepts all origins (`*`) on Node.js port `5000` and Vite port `5173`.
- **Real-time Hooks**: Ensure components clean up subscriptions (`socket.off`) in `useEffect` returns to avoid memory leaks.
- **Error Handling**: Use the global Express error boundary handling inside `index.js`.
