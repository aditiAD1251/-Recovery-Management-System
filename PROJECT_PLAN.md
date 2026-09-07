# Collection & Loan Recovery Management System (CLRMS)
## Master Project Plan & Architecture Roadmap

---

## 1. Executive Summary & Purpose

The **Collection & Loan Recovery Management System (CLRMS)** is a comprehensive, enterprise-grade banking loan recovery management platform. It streamlines and automates the lifecycle of overdue loan accounts from initial missed Equated Monthly Installments (EMIs) to resolution, restructuring, settlement, or legal recovery.

### High-Level Lifecycle
```
Missed EMI 
  └──> Overdue Account & DPD Calculation 
        └──> Supervisor Allocation / Auto-assignment 
              └──> Agent Follow-up & Contact Recording 
                    └──> Collection Attempt & Promise to Pay (PTP) 
                          ├──> Payment Received / Regularized
                          ├──> PTP Follow-up / Missed PTP Tracking
                          ├──> Settlement Negotiation & Approval
                          ├──> Escalation to Legal / Recovery Head
                          └──> Final Resolution / Write-Off & Audit
```

---

## 2. Core User Roles & Responsibilities

| Role | Key Capabilities & Permissions |
| :--- | :--- |
| **1. ADMIN** | System-wide configuration, user & agent management, regional master data, role assignments, global analytics, audit logs, and security oversight. |
| **2. COLLECTION SUPERVISOR** | Overdue account oversight, workload monitoring, dynamic/manual account assignment to agents, PTP tracking, settlement reviews, and escalation to legal. |
| **3. COLLECTION AGENT** | Workspace with assigned delinquent accounts, customer contact management, recording collection attempts/notes, creating and tracking PTPs, requesting settlements/escalations. |
| **4. LEGAL / RECOVERY HEAD** | High-risk overdue accounts review, legal notice management, recovery litigation oversight, settlement approvals/rejections, and write-off processing. |

---

## 3. Technology Stack & Design System

### Frontend (`/client`)
- **Framework**: Next.js (App Router, React 19 / TypeScript)
- **Styling**: Tailwind CSS & Vanilla CSS Design Tokens
- **Icons & UI**: Lucide Icons, Modern Data Tables, Accessible UI Components
- **State & Data Fetching**: React Hooks, Context API / Modern Fetcher with JWT Interceptor

### Backend (`/server`)
- **Runtime & Framework**: Node.js, Express.js with TypeScript
- **Architecture**: Clean 3-tier architecture (`Routes` → `Controllers` → `Services` → `Mongoose Models`)
- **API Standard**: RESTful JSON APIs with structured error handling & HTTP status codes
- **Security & Auth**: JWT (JSON Web Tokens), Bcrypt password hashing, RBAC middleware, Helmet, CORS, Input validation (Zod/Joi)

### Database & Storage
- **Database**: MongoDB (via Mongoose ODM)
- **Future Integrations**: Cloudinary for legal/recovery document storage, LMS (Loan Management System) integrations

---

## 4. System Architecture & Directory Layout

```
CLRMS/
│
├── client/                     # Next.js Frontend Application
│   ├── src/
│   │   ├── app/                # App Router pages (Role-based routes)
│   │   ├── components/         # Reusable UI & Layout components
│   │   ├── context/            # Authentication & Application contexts
│   │   ├── services/           # Frontend API clients
│   │   └── types/              # TypeScript interfaces & types
│   ├── public/                 # Static assets
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                     # Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # DB, Environment & constants configuration
│   │   ├── controllers/        # Request & Response handling
│   │   ├── middlewares/        # Auth, RBAC, Validation & Error middlewares
│   │   ├── models/             # Mongoose Schemas & Models
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Core business logic & DPD engine
│   │   ├── types/              # Backend TypeScript definitions
│   │   ├── utils/              # Helper utilities & logging
│   │   └── server.ts           # Application entry point
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                       # Technical & API documentation
├── PROJECT_PLAN.md             # Master execution roadmap
├── README.md                   # Project overview & setup guide
└── .gitignore                  # Git ignore rules
```

---

## 5. Delinquency Buckets & DPD Engine

The system computes **Days Past Due (DPD)** continuously based on the earliest unpaid EMI due date and classifies accounts into standard delinquency buckets:

```
┌─────────────────┬───────────────────┬──────────────────────────────────────────┐
│ Bucket Range    │ Delinquency Stage │ Primary Action Strategy                  │
├─────────────────┼───────────────────┼──────────────────────────────────────────┤
│ 0 – 30 Days     │ Early Stage (SMA0)│ Soft reminders, SMS/Call, early PTP      │
│ 31 – 60 Days    │ Mid Stage (SMA1)  │ Intensive agent follow-up, visits        │
│ 61 – 90 Days    │ Late Stage (SMA2) │ Critical warnings, settlement evaluation │
│ 90+ Days        │ Default / NPA     │ Legal notices, recovery escalation, repossession/write-off │
└─────────────────┴───────────────────┴──────────────────────────────────────────┘
```

---

## 6. Core Database Entities

1. **User**: Authentication, role (`ADMIN`, `SUPERVISOR`, `AGENT`, `LEGAL_HEAD`), contact, region, status.
2. **Region**: Geographic/operational territory master data.
3. **CollectionAgent**: Agent profile linked to User, supervisor mapping, active account load, recovery targets.
4. **LoanAccount / OverdueAccount**: Loan ID, customer details, principal amount, overdue amount, EMI details, DPD, Delinquency Bucket, status, assigned agent.
5. **CollectionAttempt**: Call/visit logs, customer response, disposition code, timestamp, agent reference.
6. **PromiseToPay (PTP)**: Promised amount, promise date, payment mode, fulfillment status (`PENDING`, `KEPT`, `BROKEN`).
7. **SettlementRequest**: Proposed settlement amount, waiver details, justification, approval status flow.
8. **EscalationRequest**: Reason for escalation, target authority (Legal/Recovery), recommendation, current status.
9. **AuditLog**: Timestamped tracking of critical actions (assignment changes, approvals, status updates).
10. **SystemSettings**: Thresholds, DPD calculation rules, grace periods.

---

## 7. Step-by-Step Development Roadmap

```
[STEP 0: Project Planning & Documentation]  <-- CURRENT STEP
     │
     ▼
[STEP 1: Project Foundation & Architecture (Next.js + Express + TS + DB connection)]
     │
     ▼
[STEP 2: Authentication & Role-Based Access Control (JWT, RBAC, Protected Dashboards)]
     │
     ▼
[STEP 3: Admin & Master Data Management (Users, Agents, Regions, Configs)]
     │
     ▼
[STEP 4: Loan Accounts & DPD Calculation Engine (Bucketing, Loan APIs)]
     │
     ▼
[STEP 5: Supervisor Workload & Account Assignment Engine]
     │
     ▼
[STEP 6: Collection Agent Workspace & PTP Lifecycle Management]
     │
     ▼
[STEP 7: Settlement, Escalation & Legal Recovery Workflow]
     │
     ▼
[STEP 8: Role-Specific Analytics Dashboards & Executive Reports]
     │
     ▼
[STEP 9: Audit Trail, Security Hardening, Error Handling & Automated Tests]
     │
     ▼
[STEP 10: Final Documentation, Verification & Demo Delivery]
```

### Milestone Breakdown

- **STEP 0 (Current)**: Documentation, project structure planning, baseline git configuration.
- **STEP 1**: Setup Next.js app in `/client` and Express/TS app in `/server`. Configure TypeScript, Tailwind CSS, environment variables, MongoDB connection, and basic health-check API communication.
- **STEP 2**: Implement JWT authentication, bcrypt password hashing, auth middleware, login page, and role-based redirect/protection.
- **STEP 3**: Build Admin CRUD for Users, Regions, and System Master Data.
- **STEP 4**: Create `LoanAccount` schema, implement DPD auto-calculation, delinquency bucketing, and search/filter APIs.
- **STEP 5**: Build Supervisor interfaces for auto/manual allocation of accounts to agents and workload monitoring.
- **STEP 6**: Build Agent Workspace: view portfolio, log collection attempts, capture customer interactions, create and track PTPs.
- **STEP 7**: Build multi-level settlement proposal & approval workflow, legal escalation queues, and resolution tracking.
- **STEP 8**: Develop rich, role-tailored dashboards with charts, recovery metrics, DPD transition rates, and exportable reports.
- **STEP 9**: Implement audit logging for all critical state changes, input validation (Zod), rate limiting, security headers, and unit/integration tests.
- **STEP 10**: Final polish, comprehensive API documentation, setup instructions, and walkthrough demonstration.

---

## 8. Development Rules & Quality Standards

1. **Strict Step-by-Step Execution**: Only execute the active step. Advance only upon explicit user confirmation.
2. **Clean Separation of Concerns**: Strict boundary between frontend client and backend API.
3. **No Hardcoded Secrets**: All credentials, tokens, and configuration reside in `.env` files (with `.env.example` templates).
4. **Resilient Error Handling**: Consistent JSON error responses `{ success: false, message, errors? }` and HTTP status codes.
5. **Production-Grade TypeScript**: Strict typing across both client and server; no arbitrary `any` types.
