# Ops Sentinel - GitHub CI/CD Failure Notifier Dashboard

Production-ready MVP for monitoring GitHub Actions workflows. 
Features a Palantir-style data-dense UI with neon glowing accents.

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
