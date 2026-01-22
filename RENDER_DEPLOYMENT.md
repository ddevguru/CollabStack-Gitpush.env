# Deploying Collaborative IDE to Render

This guide will walk you through deploying your Collaborative IDE application to Render.

## Quick Start (Using Blueprint)

**Fastest way to deploy:** Use Render Blueprint for one-click deployment!

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repository
5. Render will detect `render.yaml` and create all services
6. Update environment variables (OAuth keys, etc.)
7. Deploy!

**Note:** After deployment, you'll need to:
- Update `FRONTEND_URL` in backend with your frontend URL
- Update `GOOGLE_REDIRECT_URI` with your frontend URL
- Update OAuth redirect URIs in GitHub/Google consoles

---

## Manual Deployment (Step-by-Step)

If you prefer manual setup or want more control:

## Overview

Your application consists of:
- **PostgreSQL Database** - For data storage
- **Backend Service** - Node.js/Express API with Socket.IO
- **Frontend Service** - React/Vite application

## Prerequisites

1. A [Render](https://render.com) account (free tier available)
2. GitHub repository with your code
3. API keys configured (GitHub OAuth, Google OAuth, Judge0 - optional)

## Step 1: Create PostgreSQL Database

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `collaborative-ide-db` (or your preferred name)
   - **Database**: `collaborative_ide`
   - **User**: `collaborative_ide_user` (or default)
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: 15 (or latest)
   - **Plan**: Free tier or paid
4. Click **"Create Database"**
5. **Important**: Copy the **Internal Database URL** - you'll need this for the backend

## Step 2: Deploy Backend Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `collaborative-ide-backend`
   - **Region**: Same as database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### Environment Variables for Backend

Add these in the **Environment** section:

```env
# Database
DATABASE_URL=<Internal Database URL from Step 1>

# Server
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-service.onrender.com

# JWT
JWT_SECRET=<Generate a strong random string>

# GitHub OAuth (from API_KEYS_SETUP.md)
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

# Google OAuth (from API_KEYS_SETUP.md)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=https://your-frontend-service.onrender.com/auth/google/callback

# Judge0 (Optional)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your-judge0-api-key>
```

**Important Notes:**
- Use the **Internal Database URL** (starts with `postgresql://`) from your Render PostgreSQL service
- `FRONTEND_URL` should be your frontend service URL (you'll update this after deploying frontend)
- `PORT` should be `10000` (Render's default) or use `process.env.PORT` in your code
- Generate a strong `JWT_SECRET` (you can use: `openssl rand -base64 32`)

## Step 3: Deploy Frontend Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect the same GitHub repository
3. Configure the service:
   - **Name**: `collaborative-ide-frontend`
   - **Region**: Same as backend
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview` (or use a static site if preferred)
   - **Environment**: `Node`

### Option A: Web Service (Recommended for Socket.IO)

Use this if you need the Vite dev server features or Socket.IO connections.

**Build Command**: `npm install && npm run build`
**Start Command**: `npm run preview`

### Option B: Static Site (Simpler, but Socket.IO needs backend URL)

1. Click **"New +"** → **"Static Site"**
2. Configure:
   - **Name**: `collaborative-ide-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### Environment Variables for Frontend

Add these in the **Environment** section:

```env
# API Configuration
VITE_API_URL=https://your-backend-service.onrender.com

# OAuth (from API_KEYS_SETUP.md)
VITE_GITHUB_CLIENT_ID=<your-github-client-id>
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

**Important:**
- `VITE_API_URL` should be your backend service URL
- Update OAuth redirect URIs in GitHub/Google to use your production URLs

## Step 4: Update OAuth Redirect URIs

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update **Authorization callback URL** to:
   ```
   https://your-frontend-service.onrender.com/auth/github/callback
   ```

### Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Update **Authorized JavaScript origins**:
   ```
   https://your-frontend-service.onrender.com
   ```
4. Update **Authorized redirect URIs**:
   ```
   https://your-frontend-service.onrender.com/auth/google/callback
   ```

## Step 5: Update Backend Environment Variables

After deploying the frontend, update the backend's `FRONTEND_URL` environment variable:
```
FRONTEND_URL=https://your-frontend-service.onrender.com
```

Then restart the backend service.

## Step 6: Run Database Migrations

The backend build command includes `npx prisma migrate deploy`, which should run automatically. If it doesn't:

1. Go to your backend service in Render
2. Click **"Shell"** tab
3. Run:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

## Step 7: Verify Deployment

1. **Check Backend Health**: Visit `https://your-backend-service.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Frontend**: Visit `https://your-frontend-service.onrender.com`
   - Should load the application

3. **Test Features**:
   - User registration/login
   - OAuth login (GitHub/Google)
   - Create a project
   - Real-time collaboration

## Troubleshooting

### Backend Issues

**Database Connection Error:**
- Verify `DATABASE_URL` uses the **Internal Database URL**
- Check database is running in Render dashboard
- Ensure database and backend are in the same region

**Port Issues:**
- Render uses port `10000` by default
- Your code should use `process.env.PORT || 3000`
- Update `PORT` environment variable to `10000`

**Prisma Migration Errors:**
- Run migrations manually in Shell: `npx prisma migrate deploy`
- Check database connection string is correct

### Frontend Issues

**API Connection Errors:**
- Verify `VITE_API_URL` points to your backend service
- Check CORS settings in backend (should allow frontend URL)
- Ensure backend `FRONTEND_URL` matches frontend URL

**Socket.IO Connection Issues:**
- Verify Socket.IO CORS allows frontend URL
- Check WebSocket support (Render supports WebSockets)
- Ensure backend `FRONTEND_URL` is set correctly

**Build Errors:**
- Check Node version (should be 20+)
- Verify all dependencies are in `package.json`
- Check build logs in Render dashboard

### OAuth Issues

**Redirect URI Mismatch:**
- Ensure callback URLs match exactly in OAuth provider settings
- Check for trailing slashes
- Verify HTTPS (not HTTP) in production

**CORS Errors:**
- Update backend `FRONTEND_URL` environment variable
- Restart backend service after updating

## Production Optimizations

### Enable Auto-Deploy
- In each service settings, enable **"Auto-Deploy"**
- Services will redeploy on every push to the main branch

### Custom Domains
1. Go to service settings
2. Click **"Custom Domains"**
3. Add your domain
4. Update DNS records as instructed

### Environment-Specific Builds
- Use different environment variables for staging/production
- Create separate Render services for each environment

### Monitoring
- Enable **"Health Check"** in service settings
- Use Render's built-in logs for debugging
- Set up alerts for service failures

## Cost Estimation

**Free Tier:**
- PostgreSQL: 90 days free, then $7/month
- Web Services: Free tier available (spins down after inactivity)
- Static Sites: Free

**Paid Tier:**
- PostgreSQL: $7/month (Starter plan)
- Web Services: $7/month per service (Starter plan)
- Better performance, no spin-down

## Security Checklist

- [ ] Use strong `JWT_SECRET` (32+ characters, random)
- [ ] Never commit `.env` files
- [ ] Use HTTPS only (Render provides by default)
- [ ] Update OAuth redirect URIs to production URLs
- [ ] Enable CORS only for your frontend domain
- [ ] Use environment variables for all secrets
- [ ] Regularly update dependencies
- [ ] Enable database backups (paid plans)

## Support

If you encounter issues:
1. Check Render service logs
2. Verify environment variables
3. Test locally with production-like settings
4. Check Render [documentation](https://render.com/docs)
5. Review [Render community forum](https://community.render.com)

---

## Quick Reference

### Service URLs Format
- Backend: `https://collaborative-ide-backend.onrender.com`
- Frontend: `https://collaborative-ide-frontend.onrender.com`
- Database: Internal URL only (not accessible externally)

### Important Environment Variables

**Backend:**
- `DATABASE_URL` - Internal PostgreSQL URL
- `PORT` - 10000 (Render default)
- `FRONTEND_URL` - Frontend service URL
- `JWT_SECRET` - Strong random string

**Frontend:**
- `VITE_API_URL` - Backend service URL
- `VITE_GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

