# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Project Name: EventFlow / SmartEvents
## Document Version: 1.0.0
## Target Release: Q3 2026

---

## 1. EXECUTIVE SUMMARY

**EventFlow / SmartEvents** is an enterprise-grade MERN event management platform featuring a **two-way counter-offer bidding engine**. It bridges Event Organizers (hosts/planners) with verified Service Vendors (caterers, venues, photographers, decorators, sound & lighting) through real-time price negotiation and escrow payment security.

---

## 2. PROBLEM STATEMENT & OPPORTUNITY

- **Problem**: Traditional event planning is opaque. Hosts manually request quotes from dozens of vendors with non-standard pricing, slow response times, and unverified service capabilities. Vendors struggle with lead conversion and payment collection delays.
- **Opportunity**: By implementing a marketplace reverse-bidding model with counter-offers (inspired by InDrive/Adyen fintech models), hosts set explicit budget ranges, vendors submit competitive proposals, and contracts are established transparently with escrow protection.

---

## 3. USER PERSONAS

1. **Event Organizer (Host)**: Corporate planners, wedding hosts, party organizers looking for quality vendors within budget constraints.
2. **Vendor Partner**: Professional service providers seeking steady event bookings, rapid proposal submissions, and guaranteed payouts.
3. **Platform Administrator**: System managers enforcing platform compliance, managing disputes, monitoring transactions, and verifying vendor credentials.

---

## 4. PRODUCT SCOPE & CORE EPICS

### Epic 1: Identity & Role-Based Access (RBAC)
- Multi-role registration (Organizer vs Vendor) with category metadata (Catering, Photography, Venue, Decor).
- JWT session management with HTTP-only tokens and role middleware guards.

### Epic 2: Event Posting & Discovery Engine
- Multi-step event creation wizard (Event Info -> Budget Range -> Service Checklist -> Image Upload -> Bid Deadline).
- Public & vendor event discovery feed with search, category filters, and budget sliders.

### Epic 3: Two-Way Counter-Offer Negotiation Engine
- Vendor proposal submission (amount, cover letter, deliverables list, timeline).
- Organizer bid inbox with counter-offer modal (revised amount + message).
- 2-way counter-offer loop until acceptance or rejection.
- Automated contract generation upon bid acceptance.

### Epic 4: Escrow & Payout Management
- Stripe Payment Intent integration for budget escrow holding upon contract acceptance.
- Milestone verification & escrow release to vendor after event completion.

### Epic 5: Enterprise Adyen Design System
- Aesthetic: `#00112C` Deep Navy, `#0ABF53` Adyen Green Accent, full-pill CTAs (`rounded-full`), Inter font scale.

---

## 5. FUNCTIONAL REQUIREMENTS (FR)

| Req ID | Module | Requirement Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-01** | Auth | System shall support role selection (Organizer / Vendor) during registration. | P0 |
| **FR-02** | Events | Organizer shall post events with min/max budget range and service requirements. | P0 |
| **FR-03** | Bids | Vendors shall place bids specifying proposed amount, deliverables, and timeline. | P0 |
| **FR-04** | Bids | Organizer and Vendor shall negotiate via counter-offers with customized amounts. | P0 |
| **FR-05** | Payments | System shall hold funds in escrow upon bid acceptance until event completion. | P0 |
| **FR-06** | Sockets | System shall broadcast real-time toast notifications for new bids and counter-offers. | P1 |
| **FR-07** | Admin | Admin shall have access to user management, event moderation, and revenue metrics. | P1 |

---

## 6. NON-FUNCTIONAL REQUIREMENTS (NFR)

- **Performance**: Page load < 1.2s; API response time < 200ms; smooth 60fps Framer Motion transitions.
- **Security**: Passwords hashed with bcrypt (salt round 10); JWT expiration in 7 days; CORS policies enforced.
- **Reliability**: 99.999% platform availability; zero data loss on database transactions.
- **Usability**: Adyen enterprise design system compliance; fully responsive layout across desktop, tablet, and mobile.

---

## 7. SUCCESS METRIC KPIs

- **GMV (Gross Merchandise Value)**: Total dollar volume processed through escrow.
- **Bid Conversion Rate**: Percentage of open events receiving at least 3 bids.
- **Negotiation Velocity**: Average time from event creation to bid acceptance (< 48 hours).
- **User Retention**: 70%+ repeat event postings by registered organizers.
