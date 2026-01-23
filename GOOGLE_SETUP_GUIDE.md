# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on project dropdown → "New Project"
3. Enter project name (e.g., "CollabStack IDE")
4. Click "Create"

## Step 2: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Google Drive API**
   - **Google Calendar API**
   - **Google Meet API** (if available)
   - **Google+ API** (for user info)

## Step 3: Configure OAuth Consent Screen

**IMPORTANT: Pehle OAuth consent screen configure karein, phir credentials create karein**

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select User Type:
   - **External** (for testing/personal use) - Recommended for development
   - **Internal** (only for Google Workspace organizations)
   - Click **Create**

3. **App Information** (Step 1):
   - App name: `CollabStack IDE`
   - User support email: Your email address
   - App logo: (Optional - skip for now)
   - App domain: (Optional - skip for now)
   - Application home page: `http://localhost:5173` (for development)
   - Authorized domains: (Leave empty for localhost)
   - Developer contact information: Your email address
   - Click **Save and Continue**

4. **Scopes** (Step 2) - **YEH IMPORTANT HAI!**
   - Click **"Add or Remove Scopes"** button
   - **Manually add these scopes** (agar dropdown mein nahi dikh rahe):
   
   **Method 1: Search and Add (Recommended)**
   - Search box mein type karein: `drive.file`
   - Select: `.../auth/drive.file` (Google Drive API)
   - Search: `calendar`
   - Select: `.../auth/calendar` (Google Calendar API)
   - Select: `.../auth/calendar.events` (Google Calendar API)
   - Search: `userinfo.email`
   - Select: `.../auth/userinfo.email` (Google+ API)
   - Search: `userinfo.profile`
   - Select: `.../auth/userinfo.profile` (Google+ API)
   
   **Method 2: Manual Entry (Agar search mein nahi mil raha)**
   - Click **"Manually add scopes"** link (bottom of the page)
   - Add these scopes one by one:
     ```
     https://www.googleapis.com/auth/drive.file
     https://www.googleapis.com/auth/calendar
     https://www.googleapis.com/auth/calendar.events
     https://www.googleapis.com/auth/userinfo.email
     https://www.googleapis.com/auth/userinfo.profile
     ```
   
   - **Verify scopes added:**
     - Aapko yeh 5 scopes dikhne chahiye:
       - ✅ `.../auth/drive.file`
       - ✅ `.../auth/calendar`
       - ✅ `.../auth/calendar.events`
       - ✅ `.../auth/userinfo.email`
       - ✅ `.../auth/userinfo.profile`
   - Click **"Update"** or **"Save"**
   - Click **Save and Continue**

5. **Test Users** (Step 3) - **YEH BAHUT IMPORTANT HAI!** ⚠️
   - **External type use kar rahe hain?** To test users **REQUIRED** hain!
   - Click **"+ ADD USERS"** button
   - Add your email: `your-email@gmail.com` (e.g., `deepakm7778@gmail.com`)
   - **Important:** Wohi email add karein jo aap Google account mein use karte hain
   - Click **"Add"**
   - Verify email list mein dikh raha hai
   - Click **"Save and Continue"**
   
   **Note:** Agar test users add nahi karein, to Error 403: access_denied aayega!

6. **Summary** (Step 4):
   - Review all information
   - Click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted to configure consent screen, go back to Step 3 first
4. Select Application type: **Web application**
5. Name: `CollabStack IDE Web Client`
6. **Authorized JavaScript origins:**
   - Click **+ ADD URI**
   - Add: `http://localhost:5173`
   - Add: `http://localhost:3000` (if backend serves frontend)
   - Add your production URL if deploying (e.g., `https://yourdomain.com`)

7. **Authorized redirect URIs** - **YEH BAHUT IMPORTANT HAI!**
   - Click **+ ADD URI**
   - Add exactly: `http://localhost:5173/auth/google/callback`
   - **Important:** 
     - No trailing slash (`/`)
     - Use `http` not `https` for localhost
     - Exact match required - copy-paste karein
   - Add: `http://localhost:3000/auth/google/callback` (if needed)
   - Add production callback URL if deploying

8. Click **Create**

4. Create OAuth Client:
   - Application type: **Web application**
   - Name: "CollabStack IDE Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - `http://localhost:3000` (if backend serves frontend)
     - Your production URL (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs:
     - `http://localhost:5173/auth/google/callback`
     - `http://localhost:3000/auth/google/callback` (if needed)
     - Your production callback URL
   - Click **Create**

9. **Copy the credentials:**
   - **Client ID** (starts with something like `123456789-abc.apps.googleusercontent.com`)
     - Copy this immediately
   - **Client Secret** (click "Show" to reveal)
     - Copy this immediately
     - **Warning:** Client Secret sirf ek baar dikhaya jata hai!

## Step 5: Configure Backend Environment

Add to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

## Step 6: Configure Frontend Environment

Add to `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

**Important:** 
- Client ID ko quotes mein mat rakhein
- No spaces before/after `=`
- Example: `VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com`

## Step 7: Restart Servers

1. Stop both frontend and backend servers
2. Restart backend: `cd backend && npm run dev`
3. Restart frontend: `cd frontend && npm run dev`

## Step 8: Test Connection

1. Login to your application
2. Go to **Settings** page
3. Click **Connect Google** button
4. Select your Google account
5. Grant permissions
6. You should see "Google account connected successfully!"

## Troubleshooting

### Error: "redirect_uri_mismatch" (Most Common Error)
**Problem:** Redirect URI Google Console mein match nahi kar raha

**Solution:**
1. Google Cloud Console → **APIs & Services** → **Credentials**
2. Apne OAuth 2.0 Client ID ko click karein
3. **Authorized redirect URIs** section check karein
4. Ensure yeh exact URI add hai:
   ```
   http://localhost:5173/auth/google/callback
   ```
5. **Important checks:**
   - ✅ No trailing slash (`/`) at the end
   - ✅ Use `http` not `https` for localhost
   - ✅ Port number sahi hai (`5173` for Vite dev server)
   - ✅ Path exactly match karta hai (`/auth/google/callback`)
6. Agar nahi hai, to add karein aur **Save** karein
7. Browser cache clear karein aur phir try karein

**Common Mistakes:**
- ❌ `http://localhost:5173/auth/google/callback/` (trailing slash)
- ❌ `https://localhost:5173/auth/google/callback` (https instead of http)
- ❌ `http://localhost:3000/auth/google/callback` (wrong port)
- ❌ `http://127.0.0.1:5173/auth/google/callback` (use localhost, not 127.0.0.1)

### Error: "access_denied" (Error 403) - **MOST COMMON ERROR!**
**Problem:** App Testing mode mein hai aur aapka email test users mein nahi hai

**Error Message:**
```
Error 403: access_denied
Collaborative IDE has not completed the Google verification process. 
The app is currently being tested, and can only be accessed by developer-approved testers.
```

**Solution:**
1. **OAuth Consent Screen** → **Test Users** section:
   - Go to **APIs & Services** → **OAuth consent screen**
   - **Test users** section mein jayein
   - Click **"+ ADD USERS"** button
   - Apna email add karein: `your-email@gmail.com`
   - Click **"Add"**
   - Click **"Save"** (agar save button ho)
   
2. **Verify Email Added:**
   - Test users list mein apna email dikhna chahiye
   - Exact email match karein (no typos)
   
3. **Browser Cache Clear:**
   - Ctrl+Shift+Delete → Clear cache
   - Ya incognito window use karein
   - Phir se try karein

**Important:** 
- External type use kar rahe hain? To test users **REQUIRED** hain!
- Internal type? To test users ki zarurat nahi (sirf same organization ke users)
- Development ke liye Testing mode perfect hai - no verification needed!

**Still not working?** See `FIX_ACCESS_DENIED_ERROR.md` for detailed steps.

### Error: "invalid_client"
- Verify Client ID and Client Secret are correct in `.env` files
- Make sure there are no extra spaces or quotes

### Calendar/Meet not working
- Ensure Google Calendar API is enabled
- Check that calendar scopes are included in OAuth request
- Verify user has granted calendar permissions

