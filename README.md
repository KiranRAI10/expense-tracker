# Ledger — MERN Expense Tracker

A full-stack expense tracker built with MongoDB, Express, React, and Node.js. Track income and expenses, categorize spending, set monthly budgets, and visualize your finances with charts.

## Features

- **Authentication** — JWT-based register/login, passwords hashed with bcrypt
- **Transactions** — add, edit, delete, filter by month, type, category, or search text
- **Categories** — default categories shared across all users, plus custom per-user categories
- **Budgets** — set a monthly spending limit per category and track progress with a visual bar
- **Dashboard** — monthly income/expense/balance summary, a spending-by-category pie chart, and a yearly income vs. expense trend chart (Recharts)
- **Design** — a custom "ledger" visual identity: ink/paper palette, Fraunces + Inter + IBM Plex Mono type, dotted-leader transaction rows styled like a paper ledger

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React (Vite), React Router, Tailwind CSS, Recharts, Axios, lucide-react |
| Backend    | Node.js, Express |
| Database   | MongoDB (Mongoose) |
| Auth       | JWT, bcryptjs |

## Project Structure

```
expense-tracker/
├── server/                 # Express API
│   ├── config/db.js        # MongoDB connection
│   ├── models/             # User, Category, Transaction, Budget
│   ├── controllers/        # Route handlers
│   ├── routes/             # Express routers
│   ├── middleware/         # auth, error handling, async wrapper
│   ├── utils/               # JWT helper, category seed script
│   └── server.js           # App entry point
└── client/                 # React app
    └── src/
        ├── pages/          # Login, Register, Dashboard, Transactions, Categories, Budgets
        ├── components/     # Layout, forms, charts, ledger list, etc.
        ├── context/         # AuthContext (JWT session state)
        ├── services/api.js # Axios instance with auth interceptor
        └── utils/format.js # Currency/date/month helpers
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB instance — either local (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster

### 1. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — any long random string
- `CLIENT_URL` — leave as `http://localhost:5173` for local dev

Seed the default categories (Salary, Groceries, Rent, etc.) once:

```bash
npm run seed
```

Start the API server:

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default. Visit `http://localhost:5000/api/health` to confirm it's up.

### 2. Frontend setup

In a new terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The app runs on `http://localhost:5173`. Open it, register an account, and start adding transactions.

### 3. Production build (frontend)

```bash
cd client
npm run build
```

This outputs static files to `client/dist`, which you can deploy to Vercel, Netlify, or any static host. Deploy the `server` folder separately to Render, Railway, or a similar Node host, and point `VITE_API_URL` in the client's `.env` at that deployed API URL.

## API Reference

All routes except `/api/auth/register` and `/api/auth/login` require an `Authorization: Bearer <token>` header.

```
Auth
POST   /api/auth/register        { name, email, password }
POST   /api/auth/login           { email, password }
GET    /api/auth/me

Categories
GET    /api/categories
POST   /api/categories           { name, type, color }
PUT    /api/categories/:id
DELETE /api/categories/:id

Transactions
GET    /api/transactions         ?month=YYYY-MM&type=&category=&search=&page=&limit=
POST   /api/transactions         { amount, type, category, description, date }
PUT    /api/transactions/:id
DELETE /api/transactions/:id

Analytics
GET    /api/analytics/summary?month=YYYY-MM
GET    /api/analytics/by-category?month=YYYY-MM&type=expense
GET    /api/analytics/trend?year=YYYY

Budgets
GET    /api/budgets?month=YYYY-MM
POST   /api/budgets              { category, monthlyLimit, month }
DELETE /api/budgets/:id
```

## License

This project was generated as a portfolio starter — use it freely as a base for your own work.
