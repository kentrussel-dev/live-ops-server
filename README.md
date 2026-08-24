# Aetheria Live-Ops REST API & Real-Time Gateway

A Node.js and TypeScript backend service engineered for live operations management, real-time telemetry aggregation, Socket.IO operational communications, and dedicated game server fleet orchestration.

---

## Architecture Overview

The backend integrates three core service domains:

1. **Content & Live Operations Management**: Schedules, promotional campaigns, patch release pipelines, shop rotations, and player-facing issue triage.
2. **Real-Time Discuss Hub & Push Notification Gateway**: Socket.IO WebSocket layer managing real-time public channels, 1-on-1 direct messages, presence detection, typing indicators, delivery receipts (`✓` / `✓✓`), and automated task notifications.
3. **Game Server Fleet Infrastructure**: Infrastructure-level monitoring, telemetry ingestion (CCU, simulation tick rate, round-trip latency, hardware utilization), and administrative controls (traffic draining, maintenance lockout, node decommissioning).

### Technology Stack

- **Runtime**: Node.js 20+ / TypeScript 5
- **HTTP Framework**: Express 4 with security middleware (`helmet`, `cors`, `morgan`)
- **Real-Time Engine**: Socket.IO 4.8 with JWT handshake authentication
- **Database**: MongoDB with Mongoose ODM
- **Schema Validation**: Zod
- **Authentication**: Stateless JSON Web Tokens (JWT) with persistent cookie support and Role-Based Access Control (RBAC)
- **API Documentation**: OpenAPI 3.0 via Swagger UI (`/api/docs`)
- **Test Runner**: Vitest with Supertest (**40 tests across 8 test suites**)

---

## API Endpoints & Subsystems

| Endpoint Namespace | Subsystem | Supported Operations | Access Control |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | Authentication & Operators | Login, session inspection, master key bootstrap, user listing | Public / Admin |
| `/api/v1/chat` | Discuss Hub & Direct Messages | Channels list, create channel, DM lookup, message streams, reactions, seen receipts | Staff |
| `/api/v1/notifications` | Operator Inbox & Alerts | Notification list, unread counter, mark as read, mark all read | Staff |
| `/api/v1/events` | Game Event Operations | Event lifecycle, scheduling, loot multipliers, segment targeting | Editor, Admin |
| `/api/v1/patches` | Patch Notes & Build Deployment | Versioning, maintenance duration, build numbers, diff audits | Editor, Admin |
| `/api/v1/shop-rotations` | Economy & Shop Rotations | Catalog scheduling, flash sales, discount overrides, inventory caps | Editor, Admin |
| `/api/v1/issues` | Incident Triage & Blockers | P0 critical issue tracking, cluster impact, assignee routing, internal notes | Staff |
| `/api/v1/timeline` | Synchronized Schedule Matrix | Aggregated timeline stream across events, deployments, and sales | Staff |
| `/api/v1/servers` | Server Fleet Telemetry | Node metrics (CCU, tick rate, ping), reboot, player traffic draining | Read: Staff / Write: Admin |
| `/api/v1/system` | System Health & Audit Trail | Telemetry stats, cluster health checks, immutable audit logging | Staff |

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MongoDB instance (`mongodb://127.0.0.1:27017/live_ops_console`)

### Installation

```bash
npm install
```

### Database Management

```bash
# Populate database with realistic seed data (operators, channels, servers, events)
npm run seed
```

### Running the Application

```bash
# Start development server with automatic restart on file change (Port 4000)
npm run dev

# Build TypeScript to production JavaScript
npm run build

# Run production build
npm start
```

### Running Tests

```bash
# Run all 40 unit and integration tests
npm run test
```

---

## API Documentation

When the server is running, the interactive OpenAPI / Swagger interface is accessible at:
- Documentation: `http://localhost:4000/api/docs`
- Health check: `http://localhost:4000/api/health`
