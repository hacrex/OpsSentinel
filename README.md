# Ops Sentinel - GitHub CI/CD Failure Notifier Dashboard

“See every pipeline. Fix failures faster.”

**Ops Sentinel** is a GitHub-native CI/CD observability platform that provides real-time failure insights and centralized visibility. Instead of digging through logs or scattered notifications, Ops Sentinel gives you a centralized dashboard, instant alerts, and actionable insights across all repositories.

Features a Palantir-style data-dense UI with neon glowing accents.

## 💡 Elevator Pitch (Startup Pitch)

### 🧠 Problem 
**Today:**
- CI/CD failures are buried in logs
- Alerts are noisy or inconsistent
- Teams lack cross-repo visibility
- Debugging takes too long → slows delivery

👉 **Result:**
🚫 Delayed deployments | 🚫 Dev frustration | 🚫 Reduced productivity

### ⚡ Solution
**Ops Sentinel:**
- 📡 Tracks all GitHub Actions in one place
- 🚨 Sends real-time failure alerts
- 📊 Visualizes pipeline health
- 🔍 Helps identify failure patterns

## 🔥 Unique Selling Proposition (USP)
**🥇 Core USP:** “The simplest GitHub-native CI/CD observability platform.”

### 💎 Differentiation
1. **GitHub-First (Not Generic)**
   - Built specifically for GitHub workflows
   - No heavy integrations like Datadog or Splunk
2. **Lightweight but Powerful**
   - No complex setup
   - Works with just: Webhooks & OAuth
3. **Developer-Centric UX**
   - Focus on: Failures, Fix time, Productivity (NOT infra metrics noise)
4. **Cross-Repo Visibility (🔥 killer feature)**
   - One dashboard for all repos; not limited like native GitHub Actions
5. **Future AI Layer (Vision USP)**
   - Suggest root causes, recommend fixes, and predict failures

## 🧭 Positioning Statement
For DevOps teams and developers using GitHub, Ops Sentinel is a CI/CD observability platform that provides real-time failure insights and centralized visibility — without the complexity of traditional monitoring tools.

### 🆚 Competitive Positioning
| Tool | Weakness | Your Advantage |
|---|---|---|
| **GitHub Native** | Basic alerts only | Full observability |
| **Datadog** | Complex + expensive | Simple + focused |
| **Open Source** | Hard setup | Plug-and-play |
| **Action Scripts**| No UI | Full product |

### 🎯 Target Users
- DevOps Engineers (🔥 you)
- Startup engineering teams
- Indie hackers
- SaaS builders using GitHub

### 💰 Monetization (future)
- **Free tier** → 1–2 repos
- **Pro** → unlimited repos + analytics
- **Team** → collaboration + insights

### 🔥 One-Liner (for LinkedIn / Bio)
Building Ops Sentinel — a GitHub-native CI/CD observability layer to fix failures faster.

### ⚡ Founder Angle (Your Advantage)
You’re not just building a tool — you’re solving DevOps pain, CI/CD inefficiency, and the observability gap. This aligns perfectly with your Cloud + DevOps background, CI/CD + security experience, and optimization mindset (Day 0).

---

## Features
- Listens to GitHub webhook `workflow_run` events
- Verifies webhook signatures via HMAC SHA256
- Multi-repo dashboard indicating CI failures and successes
- Built-in failure analytics
- Multi-channel alerting (Email, Slack, Microsoft Teams)
- GitHub OAuth Login flow
- Docker containerization ready

## Setup Instructions

### Prerequisites
- Node.js v18+ OR Docker
- A GitHub OAuth App (for Login)
- A GitHub Repo (for Webhooks)

### GitHub OAuth Setup
1. Go to your GitHub Settings -> Developer settings -> OAuth Apps -> New OAuth App.
2. Set "Authorization callback URL" to `http://localhost:5173/login`.
3. Generate Client ID and Client Secret.

### GitHub Webhook Setup
1. Navigate to your repository -> Settings -> Webhooks.
2. Click **Add webhook**.
3. Set **Payload URL** to your backend `/webhook` endpoint (e.g., via ngrok `https://<your-ngrok>/webhook`).
4. Set **Content type** to `application/json`.
5. Set a **Secret** matching `GITHUB_WEBHOOK_SECRET` in your `.env`.
6. Select **Let me select individual events** -> check **Workflow runs**.
7. Ensure it is marked **Active** and click Add.

### Environment Setup
Copy the `.env.example` file to create your `.env` for backend and `frontend/.env` for frontend.

```bash
cp .env.example .env
```
Fill in the GitHub secrets and any optional notification service Webhook URLs.

### Running Locally (Without Docker)

**Start Backend**
```bash
cd backend
npm install
npm run dev # or node src/server.js
```

**Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Running with Docker

Run the entire stack via Docker Compose:
```bash
docker-compose up --build -d
```
The frontend will be exposed at `http://localhost` and backend at `http://localhost:3001`.

## Testing Webhooks Locally
Use the provided `sample-payload.json` to simulate a GitHub run failure manually.

```bash
curl -X POST http://localhost:3001/webhook \
  -H "x-github-event: workflow_run" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=<compute_hmac_here>" \
  -d @sample-payload.json
```
*(If signature verification is on, you will need a valid signature. Or you can remove the GITHUB_WEBHOOK_SECRET from your .env briefly to bypass verification and test insertions).*
