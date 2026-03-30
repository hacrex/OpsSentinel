# Deploying OpsSentinel to Netlify

Deploying OpsSentinel requires splitting the stack because of how the backend operates. 

**Netlify is perfect for the React Frontend**, but because your backend relies on persistent WebSockets and a local SQLite file database, it cannot run on Netlify's serverless infrastructure directly. Netlify functions are ephemeral and shut down between requests.

Here is the recommended architecture for deploying this app into a production environment:

---

## Part 1: Deploying the Frontend to Netlify

Since this is a Vite + React Single Page Application (SPA), we need to tell Netlify to redirect all routes to `index.html`.

### 1. Create `frontend/netlify.toml`
Create a file named `netlify.toml` inside the `frontend` folder with this content:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. Connect Your Repository
1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** > **Import an existing project**.
3. Authenticate with GitHub and select your `OpsSentinel` repository.

### 3. Configure Build Settings & Environment Variables
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist`

Add your Environment Variables under **Advanced configuration**:
- `VITE_API_URL`: *The public URL of your backend (e.g., `https://ops-backend.onrender.com`)*
- `VITE_GITHUB_CLIENT_ID`: *Your GitHub OAuth Client ID*

### 4. Deploy
Click **Deploy site**. Netlify will automatically build the site and deploy it!

---

## Part 2: Deploying the Backend (Render/Railway)

Because the backend heavily relies on persistent data (SQLite) and stateful connections (WebSocket for live UI notifications), you must deploy it to a platform that supports containerized Node.js servers, like **Render** or **Railway**.

### Option A: Railway (Highly Recommended for SQLite)
Railway provides seamless support for Docker and persistent volumes.

1. Go to [Railway.app](https://railway.app/).
2. Create a new project from your GitHub repository.
3. Configure the **Root Directory** as `/backend`.
4. Railway will automatically detect the Node.js server or the `Dockerfile`.
5. Add a Persistent Volume to your service in Railway and mount it to the directory where your SQLite database lives (e.g., `/app/data`). Ensure you adjust the database path in `db.js` so it writes to the mounted volume rather than the ephemeral container disk.
6. Under **Variables**, populate all required environment flags:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_WEBHOOK_SECRET`
   - `FRONTEND_URL` *(Your Netlify URL to handle CORS correctly)*

> [!WARNING]
> If you don't use a Persistent Volume for SQLite on Docker platforms, your database will be wiped completely every time you release an update.

### Option B: Transitioning to PostgreSQL
If configuring persistent volumes is tricky, you can simply spin up a managed PostgreSQL database (offered freely by Supabase, Neon, or Render). 
Your `db.js` file is already written to automatically detect PostgreSQL! 

Just supply the `DATABASE_URL` environment variable:
```env
DATABASE_URL=postgresql://user:password@hostname:5432/dbname
```
When `DATABASE_URL` is detected, the app entirely bypasses SQLite and connects to Postgres!

---

## Part 3: Updating GitHub OAuth

Once both the Frontend and Backend are live, you **must update your GitHub OAuth App**:
1. Go to GitHub -> Settings -> Developer settings -> OAuth Apps.
2. Select your Ops Sentinel app.
3. Update the **Homepage URL** to your Netlify URL (e.g., `https://my-ops-sentinel.netlify.app`).
4. Update the **Authorization callback URL** to your Netlify login route (e.g., `https://my-ops-sentinel.netlify.app/login`).

Similarly, update your GitHub Webhooks across any monitored repositories so they point to your new persistent backend URL: `https://<YOUR-RENDER-URL>/webhook`.
