# ONE MAN SHOW

> ניהול עסק שלם בלחיצת כפתור

SaaS platform for independent tradespeople — starting with shower/glass installers.

---

## Stack

| Layer    | Technology                                            |
|----------|-------------------------------------------------------|
| Frontend | React 18 + Vite                                       |
| Styling  | Tailwind CSS (RTL, mobile-first)                      |
| Backend  | Firebase (Auth + Firestore + Hosting)                 |
| Routing  | React Router v6                                       |
| State    | Zustand                                               |
| Dates    | date-fns (Hebrew locale)                              |
| Payments | Stripe (Phase 4)                                      |

---

## Quick Start

```bash
npm install
cp .env.example .env   # fill in Firebase credentials
npm run dev
```

Deploy:
```bash
firebase deploy --only firestore:rules
npm run build && firebase deploy
```

---

## Firebase Structure

```
users/{uid}/
  profile/          name, businessName, phone, email, trade
  subscription/     plan, status, expiresAt
  settings/         currency, defaultVAT, language
  clients/          CRUD
  projects/         CRUD + 7-stage status
  appointments/     CRUD + date/type
  quotes/           panels[], config{}, result{}, status
  suppliers/        type: platform|private, commissionRate
  supplierOrders/   supplierId, quoteId, items, status (6 stages)
  exports/          audit log of generated outputs
```

---

## Output Engine — 5 Types

| File             | Recipient        |
|------------------|------------------|
| ייצור זכוכית .txt | Glass factory    |
| רשימת פרזול .txt  | Hardware supplier|
| סיכום ללקוח .txt  | End customer     |
| הוראות מתקין .txt | Install crew     |
| CSV ייצור .csv    | Factory / ERP    |

---

## Phases

| Phase | Modules                                          | Status     |
|-------|--------------------------------------------------|------------|
| 1     | Auth, Dashboard, Clients, Projects, Appointments | Complete   |
| 2     | Calculator, Quotes, Settings                     | Complete   |
| 3     | Suppliers, Orders, Output Engine                 | Complete   |
| 4     | Subscriptions, Stripe, SaaS Launch               | Next       |
