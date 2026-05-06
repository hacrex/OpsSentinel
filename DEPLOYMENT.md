# OpsSentinel Deployment Guide

Since OpsSentinel supports both **Self-Hosted** (Single Tenant) and **SaaS** (Multi-Tenant) modes, there are several ways to host the platform depending on your needs.

---

## 1. The "Easiest & Most Cost-Effective" (Recommended for MVP / Self-Hosted)

**Platform:** Virtual Private Server (VPS) via DigitalOcean, Hetzner, or Linode.

Because OpsSentinel is fully containerized, you can rent a cheap Linux server (starting at $5-$10/month) and deploy your entire stack in minutes. This runs both the frontend, backend, and PostgreSQL database via Docker.

**How to deploy:**
1. Provision an Ubuntu server and SSH into it.
2. Install Docker and Docker Compose.
3. Clone your repository: `git clone https://github.com/hacrex/OpsSentinel.git`
4. Copy `.env.example` to `.env` and fill in your variables.
   - *Note: If you want to enable multi-tenancy, set `SAAS_MODE=true`.*
5. Run `docker-compose up -d --build`.

**Pros:** Extremely cheap, gives you full control, and perfectly matches the current Docker setup. Handles WebSockets effortlessly.

---

## 2. The "Fully Managed SaaS" Route (Zero Server Maintenance)

**Platform:** Render / Railway (Backend) + Vercel / Netlify (Frontend).

If you don't want to manage Linux servers or Docker yourself, you can deploy the frontend, backend, and database separately to managed platforms.

### Frontend (Netlify / Vercel)
Since the frontend is a Vite + React Single Page Application (SPA), deploy it to Vercel or Netlify.
1. Connect your GitHub repo to Netlify/Vercel.
2. Set the Root Directory to `frontend`.
3. Build command: `npm run build`, Output directory: `dist`.
4. Ensure you configure SPA routing (e.g., in Netlify, redirect `/*` to `/index.html` with status 200).
5. Set your environment variables (`VITE_API_URL`, `VITE_GITHUB_CLIENT_ID`).

### Backend (Render / Railway)
Because the backend uses persistent stateful connections (WebSockets for live UI notifications), it cannot run on serverless functions.
1. Connect your GitHub repo to Render or Railway.
2. Set the Root Directory to `backend`.
3. Provision a managed PostgreSQL database through the platform and set the `DATABASE_URL` environment variable.
4. Populate your other `.env` variables (`SAAS_MODE`, `GITHUB_CLIENT_ID`, etc.).

**Pros:** Automatic deployments on git push, zero server maintenance, and great built-in CDN for the frontend.

---

## 3. The "Enterprise Scale" Route

**Platform:** AWS (ECS/Fargate) or Google Cloud Run.

If you anticipate massive scale for your SaaS and want to stay within major cloud providers.

1. **Containers:** Deploy your Dockerized backend using AWS Fargate or Google Cloud Run.
2. **Database:** Use a managed database like AWS RDS for PostgreSQL or Google Cloud SQL.
3. **Frontend:** Host the static frontend on AWS S3 + CloudFront or Google Cloud Storage + Cloud CDN.

**Pros:** Infinite horizontal scalability and high availability.
**Cons:** Steeper learning curve, complex networking/VPC setups, and significantly more expensive.

---

## Post-Deployment Checklist

Once your environments are live, ensure you:

1. **Update GitHub OAuth Callback URL:** In your GitHub OAuth App settings, update the Authorization callback URL to point to your new production frontend (e.g., `https://my-saas.com/login`).
2. **Configure Webhooks:** Update the webhook payloads in your monitored GitHub repositories to point to your production backend (e.g., `https://api.my-saas.com/webhook` or `https://api.my-saas.com/webhook/<tenant_id>` in SaaS mode).
