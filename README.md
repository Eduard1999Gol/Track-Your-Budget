# Track Your Budget

A full-stack personal finance tracker with Google OAuth authentication, transaction management, and monthly spending visualizations.

---

## Features

- **Google Sign-In** — Secure OAuth 2.0 authentication via Google
- **Transaction Management** — Add, view, and delete income and expense entries
- **Category Breakdown** — Pre-defined categories (Salary, Rent, Groceries, Transport, Entertainment, Insurance, Miscellaneous)
- **Monthly Summary** — Bar chart showing monthly income vs. expenses over time
- **Current Month Overview** — Cards displaying total income, expenses, and balance for the current month
- **JWT Authentication** — Short-lived access tokens (5 min) with automatic silent refresh via rotating refresh tokens (4 days)
- **Per-User Data** — All transactions are scoped to the authenticated user

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS v4 | Styling |
| shadcn/ui + Radix UI | Component library |
| Recharts | Charts and data visualization |
| Axios | HTTP client with JWT interceptor |
| @react-oauth/google | Google OAuth integration |

### Backend

| Technology | Purpose |
|---|---|
| Django 6 | Web framework |
| Django REST Framework | REST API |
| djangorestframework-simplejwt | JWT access + refresh tokens |
| django-allauth | Social account scaffolding |
| google-auth | Google ID token verification |
| PostgreSQL | Database |
| django-cors-headers | CORS configuration |

---

## Project Structure

```
track-your-budget/
├── app-frontend/          # React + Vite frontend
│   └── src/
│       ├── components/
│       │   └── budget/    # Dashboard widgets (cards, chart, list, modal)
│       ├── lib/
│       │   ├── apiClient.ts   # Axios instance with JWT interceptor
│       │   └── types.ts       # Shared TypeScript types
│       ├── Dashboard.tsx
│       ├── Login.tsx
│       └── App.tsx
└── backend/               # Django backend
    ├── api/
    │   ├── models.py      # Transaction model
    │   ├── views.py       # API views (auth, transactions, summary)
    │   ├── serializers.py
    │   └── urls.py
    └── backend/
        └── settings.py
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL
- A Google Cloud project with OAuth 2.0 credentials

### 1. Clone the repository

```bash
git clone <repo-url>
cd track-your-budget
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
DJANGO_SECRET_KEY=your-django-secret-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_SECRET=your-google-oauth-client-secret
DATABASE_NAME=your_db_name
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://localhost:8000`.

### 3. Frontend setup

```bash
cd app-frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

> The Vite dev server proxies all `/api` requests to `http://127.0.0.1:8000`, so no CORS issues during development.

### 4. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create an OAuth 2.0 Client ID (Web Application type)
3. Add `http://localhost:5173` as an authorized JavaScript origin
4. Copy the Client ID into your backend `.env` as `GOOGLE_CLIENT_ID`
5. Pass the same Client ID to the `GoogleOAuthProvider` in `App.tsx`

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/google/` | No | Exchange Google ID token for JWT |
| POST | `/api/token/refresh/` | No | Refresh access token |
| GET | `/api/transactions/` | Yes | List all transactions for the user |
| POST | `/api/transactions/` | Yes | Create a new transaction |
| DELETE | `/api/transactions/<id>/` | Yes | Delete a transaction |
| GET | `/api/monthly-summary/` | Yes | Monthly income/expense aggregates |

---

## Authentication Flow

```
User clicks "Sign in with Google"
  → Google returns an ID token
  → Frontend POSTs token to /api/auth/google/
  → Backend verifies token with Google's public keys
  → Backend issues its own JWT (access + refresh)
  → Frontend stores tokens in localStorage
  → All subsequent API requests include Authorization: Bearer <access_token>
  → On 401, the interceptor silently refreshes via /api/token/refresh/
  → On refresh failure, user is logged out
```

---

## Transaction Categories

| Value | Label |
|---|---|
| `gehalt` | Gehalt (Salary) |
| `miete` | Miete (Rent) |
| `lebensmittel` | Lebensmittel (Groceries) |
| `transport` | Transport |
| `unterhaltung` | Unterhaltung (Entertainment) |
| `versicherung` | Versicherung (Insurance) |
| `sonstiges` | Sonstiges (Miscellaneous) |

---

## Development Notes

- JWT access tokens expire after **5 minutes**; refresh tokens after **4 days** (rotated on use)
- The backend enforces Google-only login — password authentication is disabled for OAuth-created accounts
- CORS is restricted to `localhost:5173` in development
- The `DEBUG = True` setting must be changed before any production deployment
