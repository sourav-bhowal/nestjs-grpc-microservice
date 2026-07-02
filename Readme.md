# NestJS gRPC Microservice

A pnpm monorepo demonstrating a microservice architecture with **NestJS**, **gRPC**, and **HTTP REST**. An API gateway fronts the services, auth issues JWTs and validates tokens over gRPC, and profile manages user data without ever touching the JWT secret.

## Architecture

```
                    ┌─────────────────┐
                    │   api-gateway   │  :3000  (HTTP entry point)
                    │  JWT + throttle │
                    └────────┬────────┘
                             │ HTTP proxy
              ┌──────────────┼──────────────┐
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  auth-service   │           │ profile-service │
    │  HTTP  :3001    │◄── gRPC ──│  HTTP  :3002    │
    │  gRPC  :50051   │           │  (gRPC client)  │
    └────────┬────────┘           └────────┬────────┘
             │                               │
             ▼                               ▼
      PostgreSQL (users)              PostgreSQL (profiles)
```

| Service | Port | Role |
|---------|------|------|
| **api-gateway** | `3000` | Single HTTP entry point — proxies requests, enforces JWT on protected routes, rate-limits via Redis |
| **auth-service** | `3001` (HTTP), `50051` (gRPC) | Register, login, issue JWTs; exposes `ValidateToken` over gRPC |
| **profile-service** | `3002` | Read/update user profiles; validates tokens by calling auth over gRPC |

**HTTP** is the public API. **gRPC** is the internal channel for service-to-service token validation — profile never needs `JWT_SECRET`. See [docs/grpc.md](docs/grpc.md) for a deep dive.

## Tech Stack

- [NestJS](https://nestjs.com/) 11
- [gRPC](https://grpc.io/) (`@grpc/grpc-js`, `@nestjs/microservices`)
- [Drizzle ORM](https://orm.drizzle.team/) + [Neon](https://neon.tech/) PostgreSQL
- [JWT](https://github.com/nestjs/jwt) authentication
- [Redis](https://redis.io/) rate limiting (`@nestjs/throttler`)
- pnpm workspaces

## Project Structure

```
nestjs-grpc-microservice/
├── apps/
│   ├── api-gateway/       # HTTP reverse proxy, JWT guard, throttling
│   ├── auth-service/      # Auth HTTP API + gRPC server
│   └── profile-service/   # Profile HTTP API + gRPC client
├── libs/
│   └── shared/
│       └── src/proto/     # Shared gRPC contract (auth.proto)
├── docs/
│   └── grpc.md            # gRPC implementation guide
└── docker-compose.yml     # Redis for local development
```

## Prerequisites

- **Node.js** 18+
- **pnpm** 9+
- **PostgreSQL** — two Neon (or other Postgres) databases recommended (one per service)
- **Redis** — for gateway rate limiting

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Redis

```bash
docker compose up -d
```

### 3. Configure environment variables

Create a `.env` file in each app directory.

**`apps/api-gateway/.env`**

```env
PORT=3000
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
AUTH_SERVICE_URL=http://localhost:3001
PROFILE_SERVICE_URL=http://localhost:3002
```

**`apps/auth-service/.env`**

```env
PORT=3001
GRPC_PORT=50051
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@host/auth_db?sslmode=require
```

**`apps/profile-service/.env`**

```env
PORT=3002
AUTH_SERVICE_GRPC_URL=localhost:50051
DATABASE_URL=postgresql://user:pass@host/profile_db?sslmode=require
```

> `JWT_SECRET` must be identical in **api-gateway** and **auth-service**.

### 4. Run database migrations

```bash
pnpm --filter auth-service db:migrate
pnpm --filter profile-service db:migrate
```

### 5. Start the services

Open three terminals (or use a process manager):

```bash
pnpm auth      # auth-service   → http://localhost:3001, gRPC :50051
pnpm profile   # profile-service → http://localhost:3002
pnpm gateway   # api-gateway     → http://localhost:3000
```

Start **auth-service** before **profile-service** so the gRPC server is available when profile boots.

## API Reference

All routes are prefixed with `/api`. Use the gateway (`:3000`) as the single entry point in production-like setups.

### Auth (public)

**Register**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Login**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

Both return `{ user, token }`. Save the `token` for protected requests.

### Auth (protected)

**Current user**

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Profile (protected)

**Get profile** — creates a default profile on first access.

```http
GET /api/profile
Authorization: Bearer <token>
```

**Update profile**

```http
PATCH /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "bio": "Hello world",
  "avatarUrl": "https://example.com/avatar.png"
}
```

## Request Flow

### Login (HTTP only)

```
Client → api-gateway → auth-service → { token }
```

### Protected profile request

```
Client → api-gateway (JWT check)
       → profile-service (GrpcAuthGuard)
       → auth-service gRPC ValidateToken
       → profile-service (load/update DB)
       → Client
```

The gateway validates JWT locally for routing. Profile re-validates via gRPC so auth remains the single source of truth for token verification.

## gRPC Contract

Defined in `libs/shared/src/proto/auth.proto`:

```protobuf
service AuthService {
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
}
```

Auth-service implements this with `@GrpcMethod`. Profile-service consumes it through `AuthClient`, wrapped in a circuit breaker for resilience.

## Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | api-gateway | `3000` | HTTP listen port |
| `PORT` | auth-service | `3001` | HTTP listen port |
| `PORT` | profile-service | `3002` | HTTP listen port |
| `GRPC_PORT` | auth-service | `50051` | gRPC listen port |
| `JWT_SECRET` | api-gateway, auth-service | — | Shared secret for signing/verifying JWTs |
| `REDIS_URL` | api-gateway | — | Redis connection for rate limiting |
| `AUTH_SERVICE_URL` | api-gateway | — | Auth HTTP base URL (e.g. `http://localhost:3001`) |
| `PROFILE_SERVICE_URL` | api-gateway | — | Profile HTTP base URL (e.g. `http://localhost:3002`) |
| `AUTH_SERVICE_GRPC_URL` | profile-service | `localhost:50051` | Auth gRPC address |
| `DATABASE_URL` | auth-service, profile-service | — | PostgreSQL connection string |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm auth` | Start auth-service in watch mode |
| `pnpm profile` | Start profile-service in watch mode |
| `pnpm gateway` | Start api-gateway in watch mode |
| `pnpm --filter <service> build` | Build a specific service |
| `pnpm --filter <service> test` | Run unit tests |
| `pnpm --filter <service> test:e2e` | Run e2e tests |
| `pnpm --filter <service> db:generate` | Generate Drizzle migrations |
| `pnpm --filter <service> db:migrate` | Apply Drizzle migrations |

## Further Reading

- [docs/grpc.md](docs/grpc.md) — how gRPC fits in, the four implementation layers, sequence diagrams, and design rationale
