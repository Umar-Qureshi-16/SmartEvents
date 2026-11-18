# SmartEvents: evaluation presentation script

Live app: https://smart-events-puce.vercel.app

## Before you start (5 minutes)

1. Open https://smart-events-puce.vercel.app/api/v1/health and wait for `"status":"healthy"`
   (the free server sleeps when idle; the first load can take about a minute).
2. Press **Ctrl + 0** in each browser window so the page is at normal size.
3. Use two browser profiles side by side:
   - **Organizer**: Muhammad Umar (customer account).
   - **Vendor**: Umar Events & Catering (provider account, signed in with Google).
4. For the admin part, sign up an Admin or Super Admin with your admin access code
   (Sign up → "Signing in as Admin or Super Admin?").
5. Optional: in Vercel → Project → Firewall, turn off Attack Challenge Mode / bot protection
   so the security checkpoint never interrupts the demo (the app also recovers from it by itself).

## What is already on the live app

- **Vendor (Umar Events & Catering, Gulberg III, Lahore)**: complete profile (cover, logo,
  tagline, description, gallery), 9 events with photos, 8 packages, 2 published AI designs
  ("Mughal Garden Royal Nikah Package" $1,200, "Marigold Mehndi Night Package" $900),
  a 5.0 star review, trust score and followers.
- **Organizer (Muhammad Umar)**: complete profile, an event plan "Our Nikah" (23 Jan 2027)
  made with the AI budget planner, and bookings in every state:
  - completed with escrow released and reviewed (Royal Palm),
  - confirmed with escrow held (wedding hall $4,500, photography package $1,800,
    Mehndi decor package $1,500, photography event $1,650 after a counter-offer),
  - in negotiation (Mehndi decor event: $1,350 → $1,450 → $1,400, waiting on the vendor),
  - awaiting the vendor (catering $900),
  - a design booking (Mughal Garden) open in the Design Studio with a decor message,
  - an entry pass with QR code in the ticket wallet.

## Flow to show (about 12 minutes)

1. **Organizer dashboard** (Organizer window): next event countdown, "Needs your attention",
   click each number card (Total bookings, In negotiation, Confirmed, Total committed) to open
   its overview window. Show accepting/countering from the In negotiation window.
2. **AI budget planner** (Event planner page): enter e.g. 9000, Nikah, Lahore, a date →
   Smartie picks one package per field within budget; swap a pick; "Book N packages".
3. **Smartie chat** (Ask Smartie button): "I have 1500 for my nikah in Lahore", then
   "Make an offer of 1500 on the Wedding Photography event". Every change shows a confirm card.
4. **Vendor profile** (Vendors → Umar Events & Catering): stats cards open followers,
   delivered events and the trust score breakdown; tabs for packages, designs (with stage
   drawings), events, gallery and reviews.
5. **Vendor dashboard** (Vendor window): open offers with "Your turn", accept or counter in the
   Open offers window; Reputation; Toolkit.
6. **Vendor Design studio**: theme "Royal walima", style "Glam", price 1000, colours
   "navy, gold, white" → Create with AI → itemised design with a drawn stage concept → Publish.
   Or ask Smartie: "Create a maroon and gold nikah stage design for 400" then "Publish it".
7. **Negotiation and Design Studio** (open any booking): price thread, then the Design Studio
   tab: brief, AI concepts within the decor budget, decor discussion. Updates appear live in
   the other window.
8. **Complete and review** (Organizer → My Bookings → Confirmed): "Complete & release" moves
   escrow to the vendor; "Rate & review" adds stars on the vendor profile.
9. **Admin / Super Admin**: Business tab (accounts, bookings, gross value, escrow held and
   released, 2.5% platform fee, value by month and field, top vendors, searchable bookings),
   users, disputes, audit log; Smartie: "Show me the revenue report".

## If something goes wrong

- A page shows the "Security checkpoint" or does nothing on click: reload the page once.
- Smartie is slow: the AI account has no credit, so it uses free models (a few seconds slower).
  Adding a few dollars of OpenRouter credit makes it fast again and enables AI pictures
  for designs ("AI picture" button in the Design studio).
