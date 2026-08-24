# Aetheria Live-Ops REST API

A Node.js and TypeScript backend service engineered for live operations management, real-time telemetry aggregation, and dedicated game server fleet orchestration in multiplayer environments.

---

## Architecture Overview

The system separates live operations into two distinct architectural domains:

1. **Content & Live Operations Management**: Schedules, promotional campaigns, patch release pipelines, shop rotations, and player-facing issue triage.
2. **Game Server Fleet Infrastructure**: Infrastructure-level monitoring, telemetry ingestion (CCU, simulation tick rate, round-trip latency, hardware utilization), and administrative controls (traffic draining, maintenance lockout, node decommissioning).

### Technology Stack

- **Runtime**: Node.js 20+ / TypeScript 5
- **HTTP Framework**: Express 4 with security middleware (`helmet`, `cors`, `morgan`)
- **Database**: MongoDB with Mongoose ODM
- **Schema Validation**: Zod
- **Authentication**: Stateless JSON Web Tokens (JWT) with persistent cookie support and Role-Based Access Control (RBAC)
- **API Documentation**: OpenAPI 3.0 via Swagger UI (`/api/docs`)
- **Test Runner**: Vitest with Supertest

---

## API Endpoints & Subsystems

| Endpoint Namespace | Subsystem | Supported Operations | Access Control |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | Authentication & Operator Management | Login, session inspection, master key bootstrap, user CRUD | Public / Admin |
| `/api/v1/events` | Game Event Operations | Event lifecycle, scheduling, loot multipliers, segment targeting | Editor, Admin |
| `/api/v1/patches` | Patch Notes & Build Deployment | Versioning, maintenance duration, build numbers, diff audits | Editor, Admin |
| `/api/v1/shop-rotations` | Economy & Shop Rotations | Catalog scheduling, flash sales, discount overrides, inventory caps | Editor, Admin |
| `/api/v1/issues` | Incident Triage & Blockers | P0 critical issue tracking, cluster impact, internal notes | Staff |
| `/api/v1/timeline` | Synchronized Schedule Matrix | Aggregated timeline stream across events, deployments, and sales | Staff |
| `/api/v1/servers` | Server Fleet Telemetry | Node metrics (CCU, tick rate, ping), reboot, player traffic draining | Read: Staff / Write: Admin |
| `/api/v1/system` | System Health & Audit Trail | Telemetry stats, cluster health checks, immutable audit logging | Staff |

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MongoDB instance (local or MongoDB Atlas)

### Environment Configuration

Create a `.env` file in the root of the server directory based on `.env.example`:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/live_ops_console
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=30d
ROOT_ADMIN_KEY=AetheriaRootSecret2026!
CLIENT_ORIGIN=http://localhost:3000
ENABLE_MEMORY_DB_FALLBACK=true
```

### Installation

```bash
npm install
```

### Running the Application

```bash
# Start development server with automatic restart on file change
npm run dev

# Build TypeScript to production JavaScript
npm run build

# Run production build
npm start
```

### Database Management

```bash
# Populate database with realistic seed data
npm run seed

# Wipe all database collections to an empty state
npm run clean
```

### Running Tests

The test suite validates authentication guards, RBAC enforcement, schema validations, and fleet state transitions.

```bash
npm run test
```

---

## API Documentation

When the server is running, the interactive OpenAPI / Swagger interface is accessible at:
- Documentation: `http://localhost:4000/api/docs`
- Health check: `http://localhost:4000/api/health`
