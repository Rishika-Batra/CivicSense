# CivicSense

**CivicSense** is a civic issue reporting platform where citizens can pin, photograph, and track urban problems (potholes, garbage, broken streetlights, etc.) and city officers can triage and resolve them.

The monorepo contains three services:

| Service | Stack | Local Port |
|---|---|---|
| `/client` | React 19 · Vite · TypeScript · Tailwind · shadcn/ui | `5173` |
| `/server` | Node.js · Express 5 · TypeScript · Mongoose | `5000` |
| `/ai-service` | Python · FastAPI · YOLOv8 (Ultralytics) | `8000` |

---

## Table of Contents

1. [Local Development](#local-development)
2. [Environment Variables](#environment-variables)
3. [Testing](#testing)
4. [Deployment — Client (Vercel)](#deployment--client-vercel)
5. [Deployment — Server (Render)](#deployment--server-render)
6. [Deployment — AI Service (Render Docker)](#deployment--ai-service-render-docker)
7. [Database — MongoDB Atlas](#database--mongodb-atlas)
8. [Architecture Overview](#architecture-overview)

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- Python 3.10+
- MongoDB (local or Atlas free tier)

### 1 — Install dependencies

```bash
# From the repo root — installs client + server via npm workspaces
npm install

# Python dependencies for the AI service
cd ai-service
python3 -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2 — Configure environment files

```bash
# Client
cp client/.env.example client/.env.local

# Server
cp server/.env.example server/.env
# Edit server/.env and fill in MONGO_URI, JWT_SECRET, and Cloudinary credentials
```

### 3 — Start all services

```bash
# Terminal 1 — React client
npm run dev:client

# Terminal 2 — Express API
npm run dev:server

# Terminal 3 — FastAPI AI service
npm run dev:ai
```

Open **http://localhost:5173** in your browser.

### 4 — Bootstrap First Admin Account

To seed the initial system admin account without manual database editing, configure the `ADMIN_EMAIL` and `ADMIN_PASSWORD` variables in `server/.env`, and then run the seeding script:
```bash
cd server
npm run seed:admin
```

---

## Environment Variables

### Client (`/client/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the Express server (`http://localhost:5000` locally) |

All `VITE_*` variables are inlined at build time by Vite. They are **not secret** and will be visible in the compiled JS bundle.

### Server (`/server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default `5000`; Render injects `10000`) |
| `NODE_ENV` | Yes | Set to `production` on Render |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Min 32-char random string for signing JWTs |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend origins (e.g. `https://civicsense.vercel.app`) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `AI_SERVICE_URL` | Yes | Base URL of the FastAPI AI service |
| `ADMIN_EMAIL` | Yes (for seeding) | Email used to seed the initial system admin account |
| `ADMIN_PASSWORD` | Yes (for seeding) | Password used to seed the initial system admin account |

Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Testing

```bash
# Server — Jest + Supertest (10 tests: auth routes, complaint RBAC)
cd server && npm run test

# Client — Vitest + React Testing Library (12 tests: Login, ReportIssue)
cd client && npm run test

# Client in watch mode
cd client && npm run test:watch
```

---

## Deployment — Client (Vercel)

The client is a Vite SPA deployed to **Vercel**. The [`client/vercel.json`](./client/vercel.json) is already committed and handles SPA routing rewrites and security headers.

### Steps

1. **Push** your repo to GitHub / GitLab / Bitbucket.

2. **Import** the project at [vercel.com/new](https://vercel.com/new):
   - Set **Root Directory** to `client`
   - Framework preset will auto-detect **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Add environment variable** in Vercel → Project → Settings → Environment Variables:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://civicsense-server.onrender.com` |

4. **Deploy.** Vercel will run the build and serve the `dist/` output.

5. After deploy, copy the assigned Vercel URL (e.g. `https://civicsense.vercel.app`) and add it to the server's `ALLOWED_ORIGINS` variable on Render.

> [!TIP]
> To use a custom domain, go to Vercel → Project → Settings → Domains and add it there. Update `ALLOWED_ORIGINS` on the server to include the custom domain.

---

## Deployment — Server (Render)

The Express API is deployed to **Render** as a Node web service. The [`render.yaml`](./render.yaml) Blueprint at the repo root can auto-configure the service.

### Option A — Blueprint (recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint**
2. Connect your Git repo — Render will detect `render.yaml` automatically
3. In the **civicsense-server** service, set the following **secret** env vars in the Render dashboard (these are marked `sync: false` and are never committed):

   | Variable | Value |
   |---|---|
   | `MONGO_URI` | Your Atlas connection string |
   | `JWT_SECRET` | Your generated secret |
   | `ALLOWED_ORIGINS` | `https://civicsense.vercel.app` |
   | `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
   | `AI_SERVICE_URL` | `https://civicsense-ai.onrender.com` |

4. Click **Apply** — Render will build and deploy both services.

### Option B — Manual Dashboard Setup

1. **New → Web Service** → connect repo
2. Set **Root Directory**: `server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `node dist/index.js`
5. **Environment**: `Node`
6. Add all env vars from the table above in the **Environment** tab
7. Set **Health Check Path**: `/`

> [!IMPORTANT]
> Render's free tier **spins down** services after 15 minutes of inactivity. The first request after a cold start takes ~30 seconds. Upgrade to the **Starter ($7/mo)** plan to keep the server always-on.

---

## Deployment — AI Service (Render Docker)

The AI service is deployed as a **Docker container** on Render. It downloads YOLOv8 weights at build time so the container starts instantly.

### Model Weights Strategy

| Scenario | Action |
|---|---|
| **Stock YOLOv8n** (default) | Downloaded automatically from Ultralytics Hub during `docker build`. No action needed. |
| **Custom fine-tuned model** | Place `best.pt` in `ai-service/models/` before building. The Dockerfile copies it in. For large files (>100 MB), use [Git LFS](https://git-lfs.com/) or store in Cloudinary/S3 and download via a startup script. |

### Steps

1. The Blueprint (`render.yaml`) already defines the **civicsense-ai** Docker service.
   - **Root Directory**: `ai-service`
   - **Dockerfile Path**: `./Dockerfile`
   - **Health Check**: `/health`

2. If deploying manually:
   - **New → Web Service** → select repo
   - **Runtime**: Docker
   - **Dockerfile Path**: `ai-service/Dockerfile`
   - **Docker Context**: `ai-service`

3. The `PORT` env var is automatically injected by Render. The Dockerfile reads it with `${PORT:-8000}`.

> [!NOTE]
> YOLOv8 inference is CPU-only on Render's free/standard tiers. For GPU-accelerated inference consider [Modal](https://modal.com) or [Replicate](https://replicate.com) instead.

> [!WARNING]
> Render's free tier has a **512 MB RAM limit**. The YOLOv8n model (~6 MB weights) is safe. Larger models (YOLOv8m/l/x) will exceed free tier memory and require at least the **Standard plan ($25/mo)**.

---

## Database — MongoDB Atlas

### Setup

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → Add a database user with `readWriteAnyDatabase` role
3. **Network Access** → IP Allowlist:

   | Environment | Entry |
   |---|---|
   | Local dev | Your current IP (click **Add Current IP**) |
   | Render (dynamic IPs) | `0.0.0.0/0` (Allow from Anywhere) — see note below |

4. **Connect** → Drivers → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/civicsense?retryWrites=true&w=majority
   ```
5. Paste it as `MONGO_URI` in Render's environment variables.

> [!CAUTION]
> Render's free tier uses **dynamic outbound IPs** that change on every restart, making a static IP allowlist impractical. The standard workaround is to allow `0.0.0.0/0` (all IPs) in Atlas and rely on the strong credentials in the connection string for security. Upgrade to Render's **static IP add-on** ($3/mo) to lock down Atlas to a single IP.

### Indexes

The following indexes are recommended for production performance. Run these once against your Atlas cluster from MongoDB Compass or `mongosh`:

```javascript
// complaints collection
db.complaints.createIndex({ userId: 1, createdAt: -1 })
db.complaints.createIndex({ assignedOfficerId: 1, status: 1 })
db.complaints.createIndex({ status: 1, category: 1, createdAt: -1 })
db.complaints.createIndex({ "location.coordinates": "2dsphere" }) // for geo queries

// users collection
db.users.createIndex({ email: 1 }, { unique: true })
```

---

## Architecture Overview

```
Browser (Vercel)
    │  HTTPS
    ▼
Client SPA (React/Vite)
    │  REST (VITE_API_URL)
    ▼
Express API (Render — Node)
    ├── MongoDB Atlas (Mongoose)
    ├── Cloudinary (image storage)
    └── FastAPI AI (Render — Docker)
            └── YOLOv8 model
```

### Service URLs (production)

| Service | URL |
|---|---|
| Client | `https://civicsense.vercel.app` |
| Server API | `https://civicsense-server.onrender.com` |
| AI Service | `https://civicsense-ai.onrender.com` |
| Database | MongoDB Atlas (M0 free cluster) |

---

## Project Scripts

```bash
# Root — starts both dev servers
npm run dev:client     # React client on :5173
npm run dev:server     # Express API on :5000
npm run dev:ai         # FastAPI AI service on :8000

# Server
cd server
npm run build          # TypeScript compile
npm run test           # Jest + Supertest

# Client
cd client
npm run build          # Vite production build
npm run test           # Vitest + RTL
npm run test:watch     # Vitest interactive mode
```
