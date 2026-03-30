#  OpsSentinel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![Docker Image](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

**OpsSentinel** is a lightweight, GitHub-native CI/CD observability platform designed to provide real-time failure insights and centralized visibility across all your repositories. Stop digging through logs and scattered notifications—get a unified view of your pipeline health in one place.

---

## 🚀 Features

- **Real-Time Pipeline Tracking**: Listens to GitHub `workflow_run` events to track pipeline states as they change.
- **Centralized Dashboard**: A high-density, "Palantir-style" UI that indicates CI failures and successes at a glance.
- **Multi-Channel Alerting**: Instant notifications routed to **Email**, **Slack**, and **Microsoft Teams** on failures.
- **Secure by Design**: Built-in verification of GitHub webhook signatures via HMAC SHA256.
- **Seamless Auth**: Integrated GitHub OAuth login flow for secure access.
- **Flexible Storage**: Supports both **SQLite** for quick starts and **PostgreSQL** for production-grade deployments.
- **Docker Ready**: Fully containerized stack for one-command deployment.

---

## 🛠️ Architecture

OpsSentinel is built with a modern, decoupled architecture:

- **Frontend**: React (Vite) with a data-dense, dark-themed UI.
- **Backend**: Node.js (Express) handling webhooks, authentication, and notifications.
- **Database**: SQLite (default) or PostgreSQL.
- **Integrations**: GitHub Webhooks & GitHub OAuth.

---

## 🚦 Quick Start (Docker)

The fastest way to get OpsSentinel running is using Docker Compose.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hacrex/OpsSentinel.git
   cd OpsSentinel
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your GitHub OAuth and Webhook secrets.
   ```bash
   cp .env.example .env
   ```

3. **Launch the stack**:
   ```bash
   docker-compose up --build -d
   ```

- **Dashboard**: `http://localhost`
- **API**: `http://localhost:3001`

---

## 🔧 Manual Setup

### Backend
```bash
cd backend
npm install
# Ensure your .env is configured
node src/server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Yes |
| `GITHUB_WEBHOOK_SECRET` | Secret used to verify GitHub webhooks | Yes |
| `DATABASE_URL` | PostgreSQL connection string (falls back to SQLite if empty) | No |
| `SLACK_WEBHOOK_URL` | Webhook URL for Slack notifications | No |
| `TEAMS_WEBHOOK_URL` | Webhook URL for Microsoft Teams notifications | No |
| `SMTP_HOST` | SMTP server for email alerts | No |

---

## 🗺️ Roadmap

- [ ] **Predictive Analytics**: Forecast workflow failure probabilities.
- [ ] **Flaky Test Detection**: Automatically identify unreliable tests.
- [ ] **LLM Root Cause Analysis**: Summarize failure logs using AI.
- [ ] **WebSockets**: Real-time dashboard updates without polling.
- [ ] **RBAC**: Role-based access control for teams.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with ❤️ for DevOps Engineers.</p>
