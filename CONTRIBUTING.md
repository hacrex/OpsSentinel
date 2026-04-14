# Contributing to OpsSentinel

First off, thank you for considering contributing to OpsSentinel! It's people like you that make OpsSentinel such a great tool.

## 🌈 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🚀 How Can I Contribute?

### Reporting Bugs
* Check the [GitHub Issues](https://github.com/hacrex/OpsSentinel/issues) to see if the bug has already been reported.
* If you find a new bug, please open an issue and include as much detail as possible, including steps to reproduce the bug.

### Suggesting Enhancements
* Enhancement suggestions are tracked as [GitHub Issues](https://github.com/hacrex/OpsSentinel/issues).
* When creating an enhancement suggestion, please include:
    * A clear and concise description of the enhancement.
    * An explanation of why this enhancement would be useful to OpsSentinel users.

### Pull Requests
* Fork the repo and create your branch from `main`.
* If you've added code that should be tested, add tests.
* If you've changed APIs, update the documentation.
* Ensure the test suite passes.
* Make sure your code lints.

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (optional for local dev, but recommended)
- SQLite or PostgreSQL

### Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `npm install`
3. Copy `.env.example` from the root to `backend/.env` and configure your GitHub secrets.
4. Start the dev server: `npm run dev`

### Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start the Vite dev server: `npm run dev`

## 📝 Commit Message Guidelines

We follow a simple commit message convention:
- `feat: ...` for a new feature
- `fix: ...` for a bug fix
- `docs: ...` for documentation changes
- `chore: ...` for maintenance tasks

## ⚖️ License
By contributing, you agree that your contributions will be licensed under its [MIT License](LICENSE).
