# OpsSentinel: Docker Deployment Guide

The easiest and most robust way to run OpsSentinel is utilizing the included `docker-compose` configuration. This spins up the entire stack seamlessly—including a bundled PostgreSQL database, the Node.js Express Backend, and an NGINX container serving your static Vite Frontend.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed.
- [Docker Compose](https://docs.docker.com/compose/install/) installed (usually included with Docker Desktop).

---

## Step 1: Environment Configuration

OpsSentinel requires several environment variables to run, particularly for GitHub OAuth and Webhook verifications. 

In the root of the project, copy the `.env.example` file to create a `.env` file:
```bash
cp .env.example .env
```

Open your new `.env` file and configure the mandatory variables:

```ini
# GitHub App Configuration
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# URL Routing for Docker Ecosystem
# Set VITE_API_URL to the external IP/hostname routing to your backend container 
# (e.g., http://localhost:3001 if testing locally)
VITE_API_URL=http://localhost:3001

# The URL of your frontend, required for CORS origin matching in the backend
FRONTEND_URL=http://localhost:80
```

*Note: PostgreSQL variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.) are optional and will safely fallback to default credentials natively inside the docker-compose network if omitted.*

---

## Step 2: Build and Run the Stack

With your `.env` configured, you can fire up the entire stack in detached mode:

```bash
docker-compose up -d --build
```

### What happens behind the scenes?
1. **`postgres`**: A persistent PostgreSQL 15 database spins up internally and creates an insulated volume (`postgres-data`) ensuring you don't lose your CI telemetry data on restarts.
2. **`backend`**: The Node.js Express server runs on `port 3001`. It natively detects the Postgres database and runs all table schema migrations on startup.
3. **`frontend`**: The Vite React framework injects your GitHub Client variables and API path at build-time, compiling a stateless HTML/JS array. An ultra-lightweight NGINX image then serves these static scripts over `port 80`.

---

## Step 3: Verify the Installation

Check the status of your containers to ensure they are all `Up/Running`:
```bash
docker-compose ps
```

If everything boots correctly:
- Access the **UI** by visiting [http://localhost](http://localhost) on your browser.
- Verify the **API Health** ping by checking [http://localhost:3001/health](http://localhost:3001/health).

## Stopping & Management

To gracefully stop your stack while leaving the PostgreSQL data intact:
```bash
docker-compose stop
```

To entirely destroy the stack and clear your database container networks (Caution: Destructive):
```bash
docker-compose down -v
```

If you modify anything inside your `frontend/` or `backend/` source code directories, make sure you rebuild the containers so your source code is packaged into the images again:
```bash
docker-compose up -d --build
```
