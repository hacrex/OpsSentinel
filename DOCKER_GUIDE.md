# OpsSentinel: Docker Deployment Guide

The easiest and most robust way to run OpsSentinel is utilizing the included `docker-compose` configuration. This spins up the entire stack seamlessly—including a bundled PostgreSQL database, the Node.js Express Backend, and an NGINX container serving your static Vite Frontend over HTTPS.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed.
- Docker Compose (usually included with Docker Desktop).
- A domain name pointed at your server (for production TLS via Let's Encrypt).

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
VITE_API_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# HTTPS / TLS Configuration
DOMAIN_NAME=your-domain.com
CERTBOT_EMAIL=admin@your-domain.com

# PostgreSQL (used by Docker Compose)
POSTGRES_USER=ops_user
POSTGRES_PASSWORD=ops_password
POSTGRES_DB=ops_sentinel
RETENTION_DAYS=30
```

*For local development without a domain, set `DOMAIN_NAME=localhost` and `CERTBOT_EMAIL=admin@localhost`. The stack will use a self-signed certificate until you obtain a real Let's Encrypt certificate.*

*Note: PostgreSQL variables (`POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.) are optional and will safely fallback to default credentials natively inside the docker-compose network if omitted.*

### TLS / HTTPS

OpsSentinel terminates TLS at the frontend NGINX container:

- **Port 80 (HTTP)**: Serves ACME challenges for certbot and redirects all other traffic to HTTPS.
- **Port 443 (HTTPS)**: Serves the frontend UI and proxies API calls to the backend.
- **Self-signed fallback**: On first boot, if no Let's Encrypt certificate exists, a self-signed certificate is generated so the stack starts immediately. Browsers will show a security warning until a real certificate is issued.
- **Certbot**: The `certbot` service obtains a real Let's Encrypt certificate on first run. The `certbot-renewal` service runs in the background, checking for renewal every 12 hours and reloading NGINX when certificates are updated.

To obtain a real certificate for the first time:
```bash
docker compose --profile tools up certbot
```

The renewal service runs automatically with the main stack:
```bash
docker compose up -d
```

### Bundled IaC CLIs

The backend image ships with pinned, production-ready IaC tooling so `tofu apply`, `ansible-playbook`, `aws`, `kubectl`, etc. work out of the box:

| Tool | Source | Purpose |
|------|--------|---------|
| OpenTofu | GitHub releases | OpenTofu-native IaC (preferred) |
| Terraform | HashiCorp releases | Terraform IaC |
| Pulumi | pulumi.com | Pulumi IaC |
| kubectl | Kubernetes releases | Kubernetes / Crossplane |
| AWS CLI | pip | AWS / CloudFormation / CDK |
| AWS CDK | npm | AWS CDK |
| Azure CLI | Microsoft install script | Azure / Bicep |
| Packer | HashiCorp releases | Machine images |
| Vagrant | HashiCorp releases | Dev environments |
| Ansible | pip | Playbook execution |
| git, curl, wget, unzip, openssh | apk | GitOps sync over HTTPS/SSH |

CLI versions are pinned via `ENV` directives in `backend/Dockerfile`. Bump them on every release and rebuild with `docker-compose up -d --build`.

---

## Step 2: Build and Run the Stack

With your `.env` configured, you can fire up the entire stack in detached mode:

```bash
docker-compose up -d --build
```

### What happens behind the scenes?
1. **`postgres`**: A persistent PostgreSQL 15 database spins up internally and creates an insulated volume (`postgres-data`) ensuring you don't lose your CI telemetry data on restarts.
2. **`backend`**: The Node.js Express server runs on internal port 3001 (not exposed directly to the host). It natively detects the Postgres database and runs all table schema migrations on startup.
3. **`frontend`**: The Vite React framework injects your GitHub Client variables and API path at build-time. NGINX serves the static site and terminates TLS on port 443, proxying API calls to the backend over the internal docker network.
4. **`certbot-renewal`**: Runs in the background, checking for certificate renewal every 12 hours.

---

## Step 3: Verify the Installation

Check the status of your containers to ensure they are all `Up/Running`:

```bash
docker-compose ps
```

If everything boots correctly:

- Access the **UI** by visiting [https://your-domain.com](https://your-domain.com) (or `http://localhost` which auto-redirects to HTTPS).
- For local dev with `DOMAIN_NAME=localhost`, visit [https://localhost](https://localhost) — accept the self-signed cert warning.
- Verify the **API Health** ping by checking [https://your-domain.com/health](https://your-domain.com/health).

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
