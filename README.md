# Collection & Loan Recovery Management System (CLRMS)

> An enterprise-grade, full-stack banking loan recovery and delinquency management platform.

--- 

## 📌 Project Overview

**CLRMS** is designed for banks, non-banking financial companies (NBFCs), and debt recovery institutions to systematically manage delinquent loan accounts. From the moment an EMI is missed, the system facilitates Days Past Due (DPD) tracking, intelligent agent allocation, contact attempt recording, Promise to Pay (PTP) tracking, settlement negotiation, and legal escalation.

---

## 👥 User Roles & Access Control

| Role | Responsibilities |
| :--- | :--- |
| **Admin** | User and agent administration, regional territory configuration, master settings, audit logs, and global analytics. |
| **Collection Supervisor** | Delinquent portfolio distribution, agent workload balancing, PTP monitoring, settlement reviews, and legal escalation triggers. |
| **Collection Agent** | Daily portfolio execution, customer calling/visitation logs, disposition recording, PTP creation, and settlement requests. |
| **Legal / Recovery Head** | High-risk defaulted account review, legal notice issuance, court/arbitration proceedings, settlement sign-offs, and write-offs. |

---

## 📊 Delinquency Buckets (DPD Based)

The system automatically calculates Days Past Due (DPD) and classifies accounts:
- **0–30 Days (SMA0)**: Early-stage reminders and automated outreach.
- **31–60 Days (SMA1)**: Active agent outreach and phone follow-ups.
- **61–90 Days (SMA2)**: Intensive field visits and settlement evaluations.
- **90+ Days (NPA/Default)**: Legal notices, formal escalations, and asset recovery.

---

## 🛠️ Technology Stack

- **Frontend (`/client`)**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend (`/server`)**: Node.js, Express.js, TypeScript, Helmet, Morgan, CORS
- **Database**: MongoDB & Mongoose ODM
- **Authentication (Upcoming)**: JWT & Role-Based Access Control (RBAC)

---

## 🏗️ System Architecture

```
Next.js Frontend (client/)
        │  (HTTP / JSON REST)
        ▼
Express Backend (server/)
        ├── Routes & Middlewares (Auth, RBAC, Validation, Error Handling)
        ├── Controllers (Request / Response)
        ├── Services (Business logic & DPD Engine)
        └── Mongoose Models (Data Schemas)
                │
                ▼
          MongoDB Database
```

---

## 📂 Project Directory Structure

```
CLRMS/
│
├── client/                     # Next.js Frontend Application
│   ├── src/
│   │   ├── app/                # App Router pages (layout, page, globals.css)
│   │   ├── services/           # API communication layer (api.ts)
│   │   └── types/              # Client TypeScript interfaces
│   ├── .env.example            # Frontend environment variable template
│   ├── tailwind.config.ts      # Tailwind CSS configuration
│   ├── tsconfig.json           # Client TypeScript configuration
│   └── package.json            # Client scripts & dependencies
│
├── server/                     # Express + TypeScript Backend API
│   ├── src/
│   │   ├── config/             # DB & Environment configurations (db.ts, env.ts)
│   │   ├── controllers/        # Request controllers (healthController.ts)
│   │   ├── middlewares/        # Error & Not Found middlewares
│   │   ├── models/             # Mongoose schemas (Step 3+)
│   │   ├── routes/             # Express API routes (index.ts, healthRoutes.ts)
│   │   ├── services/           # Business logic services
│   │   ├── types/              # Server TypeScript definitions
│   │   ├── utils/              # Utility helpers
│   │   └── server.ts           # Express server bootstrap
│   ├── .env.example            # Backend environment variable template
│   ├── tsconfig.json           # Server TypeScript configuration
│   └── package.json            # Server scripts & dependencies
│
├── docs/                       # Technical & API documentation
├── PROJECT_PLAN.md             # Master execution roadmap
├── README.md                   # Project overview & documentation
└── .gitignore                  # Git ignore rules
```

---

## ⚙️ Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: `v18.x` or higher (Recommended: `v20.x` or `v24.x`)
- **npm**: `v9.x` or higher
- **MongoDB**: Local MongoDB Community Server running on port `27017` or a MongoDB Atlas URI string

---

## 🚀 Installation & Setup

### 1. Clone or Open the Project
```bash
cd D:/CLRMS
```

### 2. Configure Environment Variables

#### Backend (`/server`):
Copy `.env.example` to `.env` inside `server/`:
```bash
# In server/.env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/clrms
CLIENT_URL=http://localhost:3000
```

#### Frontend (`/client`):
Copy `.env.example` to `.env.local` inside `client/`:
```bash
# In client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Install Dependencies

Install Server Dependencies:
```bash
cd D:/CLRMS/server
npm install
```

Install Client Dependencies:
```bash
cd D:/CLRMS/client
npm install
```

---

## 🏃 Running the Application

### Start the Backend Server
In a terminal window:
```bash
cd D:/CLRMS/server
npm run dev
```
The backend will start at: `http://localhost:5000`

### Start the Frontend Client
In a separate terminal window:
```bash
cd D:/CLRMS/client
npm run dev
```
The frontend will start at: `http://localhost:3000`

---

## 🩺 Health Check & API Verification

### Backend Health API Endpoint:
- **URL**: `GET http://localhost:5000/api/v1/health`
- **Sample Success Response**:
```json
{
  "success": true,
  "message": "CLRMS API is running",
  "timestamp": "2026-09-04T15:30:00.000Z",
  "service": "CLRMS Backend API",
  "version": "1.0.0",
  "environment": "development",
  "database": {
    "status": "connected",
    "connected": true,
    "error": null
  }
}
```

### Frontend UI Verification:
Open `http://localhost:3000` in your web browser. You will see the **CLRMS** landing page displaying:
- System Status: **Backend Connected** (when server is running)
- Database Status: **CONNECTED** (or disconnected with status details if MongoDB is starting)
- An interactive **Test Connection** button to re-evaluate API connectivity in real time.

---

---

## 📊 STEP 8: Role-Specific Analytics Dashboards & Executive Reports Engine

CLRMS provides a comprehensive financial analytics and executive reporting suite built on real-time MongoDB aggregations and strict RBAC data restrictions.

### 🌟 Key Step 8 Features:
1. **Executive Command Center (`/admin/analytics`)**:
   - Portfolio health metrics (Total Outstanding, Total Overdue, Delinquency counts, Settled & Written-off volumes, Overall Recovery Rate).
   - Dynamic 0–30, 31–60, 61–90, 90+ DPD Aging Bar distribution.
   - Pure SVG Ring/Donut Charts for Status & Loan Type breakdowns (zero external charting bloat, 100% hydration-safe).
   - Regional performance scorecard with recovery rates.
   - Agent productivity rankings and PTP conversion leaderboard.
2. **Supervisor Team Analytics (`/supervisor/analytics`)**:
   - Scoped territory metrics (managed loans, overdue supervised, team recovery rate).
   - Agent workload and collection productivity tables.
   - Territory settlement & legal escalation queues.
3. **Collection Agent Personal Scorecard (`/agent/analytics`)**:
   - Strict personal data isolation (assigned loan portfolio, recovered amounts, PTP fulfillment rate).
   - Channel breakdown (Call, Visit, SMS, WhatsApp, Email, Notice).
   - Actionable follow-up schedule (Due Today, Overdue, Upcoming).
4. **Legal Recovery & Litigation Analytics (`/legal/analytics`)**:
   - Legal action type and forum distribution (Sec 138, SARFAESI, Arbitration, DRT, Civil Suit).
   - Litigation stage tracking (Notice, Filed, Summons, Hearing, Order, Execution).
   - Statutory notice delivery and response audit funnel.
   - Upcoming court hearings agenda.
   - Authorized debt write-offs and waiver loss audits.
5. **Executive Reports & RFC 4180 CSV Export (`/admin/reports`)**:
   - 7 standardized reports:
     - `portfolio-summary` (Executive Portfolio Summary)
     - `collection-performance` (Collection Performance & Receipts)
     - `agent-performance` (Agent Productivity & Ranking)
     - `delinquency-dpd` (Delinquency & DPD Aging Matrix)
     - `ptp-report` (Promise-to-Pay Conversion)
     - `settlement-report` (Settlement Approvals & Waivers)
     - `legal-recovery` (Legal & Litigation Pipeline)
   - Real-time on-screen preview table with dynamic pagination and column formatting.
   - One-click native RFC 4180 compliant CSV export stream.

### 🔌 Analytics REST API Endpoints:
- `GET /api/v1/analytics/admin?startDate=&endDate=` — Global executive KPIs (Admin only)
- `GET /api/v1/analytics/supervisor?startDate=&endDate=` — Scoped team analytics (Supervisor & Admin)
- `GET /api/v1/analytics/agent?startDate=&endDate=` — Personal collector analytics (Agent & Admin)
- `GET /api/v1/analytics/legal?startDate=&endDate=` — Litigation pipeline & write-off audit (Legal Head & Admin)
- `GET /api/v1/analytics/reports/:reportType?format=json|csv` — On-screen preview or downloadable CSV attachment

---

## 📈 Development Roadmap

- [x] **STEP 0**: Project planning and documentation
- [x] **STEP 1**: Project foundation & architecture (Next.js, Express, TS, MongoDB connection)
- [x] **STEP 2**: Authentication and RBAC (JWT, bcrypt, protected routes)
- [x] **STEP 3**: Admin & master data management (Users, Regions, Agents)
- [x] **STEP 4**: Loan accounts & DPD calculation engine
- [x] **STEP 5**: Supervisor workload & account assignment
- [x] **STEP 6**: Collection Agent workspace & PTP tracking
- [x] **STEP 7**: Settlement, escalation & legal recovery workflow
- [x] **STEP 8**: Role-specific dashboards & recovery analytics *(Completed)*
- [ ] **STEP 9**: Audit logs, security hardening & automated tests
- [ ] **STEP 10**: Final documentation, deployment guide & demo preparation

---

## 📖 Additional Resources

- Master Plan: [PROJECT_PLAN.md](file:///d:/CLRMS/PROJECT_PLAN.md)
