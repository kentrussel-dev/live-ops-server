# Aetheria Live-Ops REST API Server

A production-ready Node.js & TypeScript backend service powering the **Aetheria Live-Ops Console**. Provides high-throughput REST APIs, telemetry ingestion, role-based access control (RBAC), operational audit trailing, and dedicated game server fleet orchestration.

---

## 🏛️ Architecture & Tech Stack

- **Runtime**: Node.js & TypeScript
- **Framework**: Express 4 with security middleware (`helmet`, `cors`, `morgan`)
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod schema validation middleware
- **Authentication**: JWT authentication with 30-day persistent sessions & RBAC (`admin`, `liveops_editor`, `readonly_viewer`)
- **Documentation**: Interactive OpenAPI 3.0 / Swagger UI at `/api/docs`
- **Testing**: Vitest test runner with Supertest (27 automated tests)

---

## 📂 Subsystems & API Namespaces

| Namespace | Subsystem Description | RBAC Rules |
| :--- | :--- | :--- |
| `/api/v1/auth` | Operator authentication, Master Key bootstrap, staff account provisioning | Public / Admin |
| `/api/v1/events` | Live game events, scheduling, drop-rate multipliers, segment targeting | Read: Staff / Write: Editor, Admin |
| `/api/v1/patches` | Patch notes versioning, maintenance windows, build numbers, diff history | Read: Staff / Write: Editor, Admin |
| `/api/v1/shop-rotations` | Dynamic store catalog, flash sales, featured items, batch rotations | Read: Staff / Write: Editor, Admin |
| `/api/v1/issues` | Critical blocker incidents (P0), investigation pipeline, internal staff notes | Read: Staff / Write: Staff |
| `/api/v1/timeline` | Synchronized multi-track operational schedule across events, patches, sales | Read: Staff |
| `/api/v1/servers` | Dedicated game server fleet management, CCU, tick rate, latency, SRE controls | Read: Staff / Write: Admin |
| `/api/v1/system` | Operational metrics, system health, and immutable operator audit trail | Read: Staff |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster

### 2. Environment Setup
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/live_ops_console
JWT_SECRET=your_secret_jwt_key_here
ROOT_ADMIN_KEY=AetheriaRootSecret2026!
CLIENT_ORIGIN=http://localhost:3000
```

### 3. Installation
```bash
npm install
```

### 4. Running the Server
```bash
# Start development server with hot-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 5. Running Database Scripts
```bash
# Seed realistic production dataset
npm run seed

# Wipe database to a clean zero-data state
npm run clean
```

### 6. Automated Testing
```bash
# Run Vitest test suite
npm run test
```

---

## 📖 API Documentation & Swagger UI

Once the server is running, explore and test all endpoints interactively via Swagger UI:
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Health Check Endpoint**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
