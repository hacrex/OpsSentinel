# Ops Sentinel Documentation

Welcome to the comprehensive documentation for **Ops Sentinel**, a GitHub-native CI/CD observability platform designed to provide real-time failure insights and centralized visibility across all your repositories.

---

## Table of Contents
1. [Introduction](#introduction)
2. [Core Features](#core-features)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
   - [GitHub OAuth Configuration](#github-oauth-configuration)
   - [GitHub Webhook Configuration](#github-webhook-configuration)
   - [Environment Setup](#environment-setup)
5. [Running the Application](#running-the-application)
   - [Using Docker (Recommended)](#using-docker-recommended)
   - [Running Locally (Node.js)](#running-locally-nodejs)
6. [Testing the Application](#testing-the-application)
7. [Upcoming Enhancements](#upcoming-enhancements)
8. [Contributing](#contributing)

---

## Introduction

**Ops Sentinel** fundamentally changes how development and DevOps teams monitor their CI/CD pipelines. Instead of digging through logs, navigating scattered notifications, or dealing with limited visibility, Ops Sentinel offers a centralized dashboard. It instantly alerts you of failures and provides actionable insights across multiple repositories.

### Why Ops Sentinel?
- **GitHub-First:** Built specifically for GitHub workflows without the bloat of generic monitoring tools.
- **Lightweight:** No complex setup; it operates solely on Webhooks and OAuth.
- **Developer-Centric:** Focuses exclusively on failures, fix times, and productivity.

---

## Core Features

- **Real-Time Tracking:** Listens to GitHub webhook `workflow_run` events to track pipeline states as they change.
- **Secure Webhooks:** Built-in verification of webhook signatures via HMAC SHA256 to ensure data authenticity.
- **Centralized Dashboard:** A multi-repo dashboard that visually indicates CI failures and successes at a glance.
- **Failure Analytics:** Built-in analytics to help identify failure patterns and optimize CI/CD efficiency.
- **Multi-Channel Alerting:** Instant notifications routed to Email, Slack, and Microsoft Teams.
- **Seamless Authentication:** Integrated GitHub OAuth Login flow for secure and straightforward access.
- **Containerized Deployment:** Docker-ready out of the box for easy deployment and scaling.

---

## Prerequisites

Before setting up Ops Sentinel, ensure you have the following ready:
- **Node.js:** v18 or newer (if running locally without Docker).
- **Docker & Docker Compose:** If you prefer the containerized deployment method.
- **GitHub Account:** Minimum of one repository to monitor.
- **GitHub OAuth App:** Required for user authentication.

---

## Installation & Setup

### GitHub OAuth Configuration
Ops Sentinel uses GitHub for authentication. You need to create an OAuth application in GitHub:

1. Navigate to your GitHub **Settings**.
2. Go to **Developer settings** -> **OAuth Apps** -> **New OAuth App**.
3. Fill out the application details.
4. Set the **Authorization callback URL** to: `http://localhost:5173/login` (Update this if you deploy to production).
5. Once created, generate a **Client ID** and a **Client Secret**. Keep these secure.

### GitHub Webhook Configuration
To receive deployment data, Ops Sentinel requires a webhook on your target repositories:

1. Navigate to your target repository -> **Settings** -> **Webhooks**.
2. Click **Add webhook**.
3. Set **Payload URL** to your backend `/webhook` endpoint. If testing locally, use a tool like ngrok (e.g., `https://<your-ngrok-url>/webhook`).
4. Set **Content type** to `application/json`.
5. Set a **Secret** matching the `GITHUB_WEBHOOK_SECRET` environment variable you will configure in the next step.
6. Under 'Which events would you like to trigger this webhook?', select **Let me select individual events**.
7. Check ONLY **Workflow runs**.
8. Ensure the webhook is marked **Active** and click **Add webhook**.

### Environment Setup

1. Clone or navigate to the root of the Ops Sentinel project.
2. An example environment file is provided (`.env.example`). Copy this to create your `.env` file for the backend and optionally for the frontend.
   ```bash
   cp .env.example .env
   ```
3. Open the newly created `.env` file and populate the necessary credentials:
   - Your GitHub OAuth Client ID and Secret.
   - A secure `GITHUB_WEBHOOK_SECRET` matching what you configured in GitHub.
   - Any Slack/Teams Webhook URLs for external alerting.

---

## Running the Application

### Using Docker (Recommended)
Docker is the simplest way to run Ops Sentinel, as it automatically orchestrates the frontend, backend, and provisions a PostgreSQL database.

```bash
docker-compose up --build -d
```
- **Frontend Dashboard:** Available at `http://localhost`
- **Backend API:** Available at `http://localhost:3001`

### Running Locally (Node.js)
If you prefer developing directly on your host machine:

**1. Start the Backend API**
```bash
cd backend
npm install
npm run dev # or run: node src/server.js
```

**2. Start the Frontend Application**
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

---

## Testing the Application

You can simulate a GitHub Actions failure locally using the provided `sample-payload.json` file. This is useful for validating alerts and dashboard integration without triggering actual GitHub workflows.

Run the following cURL command from the root directory:

```bash
curl -X POST http://localhost:3001/webhook \
  -H "x-github-event: workflow_run" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=<compute_hmac_here>" \
  -d @sample-payload.json
```

*Note: If you have configured a `GITHUB_WEBHOOK_SECRET`, you must compute and provide a valid HMAC signature in the header. Alternatively, you can temporarily remove the secret from your `.env` file to bypass the signature verification for local testing.*

---

## Upcoming Enhancements

Ops Sentinel is actively developed. The roadmap includes:
- **Predictive Analytics:** Forecasting workflow failure probabilities.
- **Flaky Test Detection:** Automatically identifying unreliable tests.
- **Advanced Integrations:** Upcoming support for GitLab CI, Bitbucket Pipelines, and Jira.
- **Automated Remediation:** 1-Click workflow re-runs and LLM-powered root cause summarization.
- **Enterprise Features:** Role-Based Access Control (RBAC) and SSO/SAML integration.

---

## Contributing

We are always looking for contributors! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

