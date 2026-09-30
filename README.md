# 🛒 Smart Retail AI Ecosystem

[![CI](https://github.com/Haneef-Tech/Smart-Retail-ECO-System/actions/workflows/ci.yml/badge.svg)](https://github.com/Haneef-Tech/Smart-Retail-ECO-System/actions/workflows/ci.yml)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHaneef-Tech%2FSmart-Retail-ECO-System&project-name=smart-retail-eco-system&repo-name=smart-retail-eco-system&env=DATABASE_URL,GROQ_API_KEY,ADMIN_EMAIL)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Haneef-Tech/Smart-Retail-ECO-System)

A modern, production-grade Supermarket E-Commerce Storefront & Autonomous Operational Admin Control Center powered by **Next.js 16 (App Router)**, **Prisma ORM**, and **Groq AI**.

---

## 🌟 24/7 Zero-Downtime Free Deployment

This project includes automated configurations to keep your deployment active **24 hours a day, 365 days a year—even when zero users are visiting**:

1. **Option A: Vercel (Recommended - Zero Configuration)**
   - Vercel is 100% free for hobby projects.
   - Built with serverless edge architecture: **It NEVER sleeps, idles, or shuts down**.
   - Responds instantly to any visitor at any time with 0ms cold-start lag.
   - Click the **Deploy with Vercel** button above to launch in 60 seconds.

2. **Option B: Render.com (1-Click Blueprint + Automated 24/7 Keep-Alive)**
   - Render provides a 100% free Node.js Web Service running the full SQLite database.
   - **Automated Anti-Sleep Engine**: The repository includes [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) which pings `/api/health` every 10 minutes from GitHub Actions, ensuring the Render container **never sleeps or hibernates even when zero users are active**.
   - Click the **Deploy to Render** button above to launch using the pre-configured [`render.yaml`](render.yaml) blueprint.

---

## 🚀 Key Features

### 🏬 Customer Storefront
- **Full FMCG Catalog**: 25 pre-seeded daily essentials across Grocery, Dairy, Bakery, Beverages, Snacks, Personal Care, Home, and Stationery.
- **Dynamic Pricing & Stock Levels**: Real-time stock badges, discounts, and instant category filters.
- **Cart & Fast Checkout**: Cart drawer, bill preview, and automated bill generator.
- **Direct Store Ordering**: One-tap phone (`9392951463`) and email (`aluruhaneef1@gmail.com`) helpdesk.

### 🛡️ Operational Admin Control Center
- **Real-Time KPI Dashboard**: Gross revenue, order volume, live inventory health, and stockout alerts.
- **10 FMCG Suppliers Directory**: Verified suppliers (Amul, ITC, HUL, Nestlé, Britannia, Tata, etc.) with delivery lead times and contact details.
- **Autonomous Ordering Engine**: Intelligent demand forecasting, safety stock analysis, and 1-click Purchase Order approvals.
- **Store Sales CSV Upload with RAG**: Upload historical sales CSV to index store metrics into live vector/context memory.
- **Star-Free AI Assistant**: Powered by Groq LLM with direct database and sales RAG access. Formatted with clean typography and zero raw asterisks (`*`).

---

## ⚙️ Environment Variables

Configure these in your hosting dashboard (Vercel / Render):

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | SQLite or PostgreSQL connection string | `file:./dev.db` |
| `GROQ_API_KEY` | Groq API Key for AI Assistant | `gsk_...` |
| `ADMIN_EMAIL` | Admin login email (also used as store helpdesk contact) | `admin@example.com` |
| `ADMIN_PASSWORD` | Initial admin password — bcrypt-hashed on provision, never stored or committed in plaintext. If unset, no admin is created | `change-me-to-a-strong-random-password` |
| `NEXTAUTH_SECRET` | Signs admin session cookies (required in production) | Output of `openssl rand -base64 32` |
| `NEXTAUTH_SECRET` | Auth secret key | Any secure random string |

---

## 🛠️ Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Haneef-Tech/Smart-Retail-ECO-System.git
   cd Smart-Retail-ECO-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a free Postgres database (Neon)**:
   - Sign up at [neon.tech](https://neon.tech) → New Project → copy the connection strings.
   - In the Neon dashboard use the **Direct** (non-pooled) connection string — checkout runs an
     interactive Prisma transaction, which PgBouncer-style pooled connections do not support.

4. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Set in `.env` (and later in Vercel → Project Settings → Environment Variables):
   - `DATABASE_URL` = Neon **Direct** connection string
   - `DIRECT_URL` = same Neon **Direct** connection string (used by migrations)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, `GROQ_API_KEY`, Firebase keys

5. **Migrate & seed**:
   ```bash
   npx prisma migrate deploy   # apply the initial migration (creates all 30 tables)
   npm run db:seed             # idempotent: safe to run twice, 25 products upserted
   ```

6. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

7. **Build for Production** (Vercel runs migrations automatically first):
   ```bash
   npm run build
   npm start
   ```

---

## 📡 Health Check & 24/7 Keep-Alive Endpoint

- **Endpoint**: `/api/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "SmartRetail ECO-System",
    "uptimeSeconds": 1420,
    "activeProductsInCatalog": 25,
    "database": "connected"
  }
  ```
