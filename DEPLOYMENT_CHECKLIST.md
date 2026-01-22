# Render Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Preparation
- [x] All TypeScript errors fixed
- [x] `render.yaml` configured
- [x] Environment variables documented
- [x] Database migrations ready
- [x] Build commands tested locally

### 2. GitHub Setup
- [ ] Code pushed to GitHub repository
- [ ] Repository is public or Render has access
- [ ] Main branch is up to date

### 3. OAuth Credentials
- [ ] GitHub OAuth App created
  - Client ID: `_________________`
  - Client Secret: `_________________`
- [ ] Google OAuth credentials created
  - Client ID: `_________________`
  - Client Secret: `_________________`
  - Redirect URI: `https://your-frontend.onrender.com/auth/google/callback`

## 🚀 Deployment Steps

### Step 1: Deploy via Blueprint
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create:
   - ✅ PostgreSQL Database
   - ✅ Backend Web Service
   - ✅ Frontend Web Service

### Step 2: Configure Environment Variables

#### Backend Service (`collaborative-ide-backend`)
After services are created, update these manually:

- [ ] `FRONTEND_URL` = `https://collaborative-ide-frontend.onrender.com`
- [ ] `GITHUB_CLIENT_ID` = (from GitHub OAuth App)
- [ ] `GITHUB_CLIENT_SECRET` = (from GitHub OAuth App)
- [ ] `GOOGLE_CLIENT_ID` = (from Google Cloud Console)
- [ ] `GOOGLE_CLIENT_SECRET` = (from Google Cloud Console)
- [ ] `GOOGLE_REDIRECT_URI` = `https://collaborative-ide-frontend.onrender.com/auth/google/callback`
- [ ] `JUDGE0_API_KEY` = (optional, if using Judge0)

**Note:** `JWT_SECRET` and `DATABASE_URL` are auto-generated/connected ✅

#### Frontend Service (`collaborative-ide-frontend`)
- [ ] `VITE_API_URL` = `https://collaborative-ide-backend.onrender.com` (auto-set from backend service)
- [ ] `VITE_GITHUB_CLIENT_ID` = (from GitHub OAuth App)
- [ ] `VITE_GOOGLE_CLIENT_ID` = (from Google Cloud Console)

**Important:** After setting `VITE_API_URL`, you need to **rebuild** the frontend service because Vite env vars are baked in at build time.

### Step 3: Update OAuth Redirect URIs

#### GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update **Authorization callback URL**:
   ```
   https://collaborative-ide-frontend.onrender.com/auth/github/callback
   ```

#### Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Update **Authorized JavaScript origins**:
   ```
   https://collaborative-ide-frontend.onrender.com
   ```
4. Update **Authorized redirect URIs**:
   ```
   https://collaborative-ide-frontend.onrender.com/auth/google/callback
   ```

### Step 4: Rebuild Frontend
After setting `VITE_API_URL`:
1. Go to Frontend service in Render
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. This will rebuild with the correct API URL

### Step 5: Verify Deployment

#### Check Backend
- [ ] Visit: `https://collaborative-ide-backend.onrender.com/health`
- [ ] Should return: `{"status":"ok","timestamp":"..."}`

#### Check Frontend
- [ ] Visit: `https://collaborative-ide-frontend.onrender.com`
- [ ] Should load the landing page
- [ ] Check browser console for errors

#### Test Features
- [ ] User registration/login works
- [ ] OAuth login (GitHub/Google) works
- [ ] Can create teams and projects
- [ ] Real-time collaboration works
- [ ] File editing works
- [ ] Socket.IO connections work

## 🔧 Troubleshooting

### Backend Issues
- **Database connection error**: Check `DATABASE_URL` uses Internal Database URL
- **Port issues**: Backend should use `PORT=10000` (Render default)
- **Migration errors**: Check build logs, may need to run manually

### Frontend Issues
- **API not connecting**: Check `VITE_API_URL` is set correctly and frontend was rebuilt
- **Socket.IO not connecting**: Check backend `FRONTEND_URL` matches frontend URL
- **Build errors**: Check Node version (should be 20+)

### OAuth Issues
- **Redirect URI mismatch**: Ensure exact match in OAuth provider settings
- **CORS errors**: Update backend `FRONTEND_URL` and restart

## 📝 Post-Deployment

### Enable Auto-Deploy
- [ ] Enable auto-deploy for all services
- [ ] Services will redeploy on every push to main branch

### Custom Domain (Optional)
- [ ] Add custom domain in service settings
- [ ] Update DNS records
- [ ] Update OAuth redirect URIs to use custom domain

### Monitoring
- [ ] Enable health checks
- [ ] Set up alerts for service failures
- [ ] Monitor logs regularly

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ All three services (DB, Backend, Frontend) are running
- ✅ Health check endpoint returns OK
- ✅ Frontend loads without errors
- ✅ Users can register/login
- ✅ OAuth login works
- ✅ Real-time collaboration works
- ✅ Socket.IO connections are stable

---

## Quick Reference

### Service URLs (after deployment)
- Backend: `https://collaborative-ide-backend.onrender.com`
- Frontend: `https://collaborative-ide-frontend.onrender.com`
- Database: Internal only (not accessible externally)

### Important Notes
- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Paid plans ($7/month) keep services always running
- Database free tier is 90 days, then $7/month

