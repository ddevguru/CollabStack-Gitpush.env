# Fix Redirect URI Mismatch Error

## Error Message
```
Error 400: redirect_uri_mismatch
```

## Problem
Google OAuth redirect URI Google Cloud Console mein configured URI se match nahi kar raha.

## Solution - Step by Step

### Step 1: Check Current Redirect URI

Apne code mein check karein kya redirect URI use ho raha hai:

**Frontend Code (`frontend/src/pages/Settings.tsx`):**
```typescript
const redirectUri = `${window.location.origin}/auth/google/callback`;
```

Agar aap `http://localhost:5173` par run kar rahe hain, to redirect URI hoga:
```
http://localhost:5173/auth/google/callback
```

### Step 2: Google Cloud Console Mein Add Karein

1. **Google Cloud Console** open karein: https://console.cloud.google.com/
2. Apna project select karein
3. **APIs & Services** → **Credentials** par jayein
4. Apne **OAuth 2.0 Client ID** ko click karein (jo aapne create kiya hai)

### Step 3: Authorized Redirect URIs Check Karein

**"Authorized redirect URIs"** section mein yeh exact URI add karein:

```
http://localhost:5173/auth/google/callback
```

**Important Points:**
- ✅ Use `http` not `https` for localhost
- ✅ Port number sahi hai (`5173` for Vite dev server)
- ✅ No trailing slash (`/`) at the end
- ✅ Exact match required - copy-paste karein

### Step 4: Common Mistakes to Avoid

❌ **Wrong:**
```
http://localhost:5173/auth/google/callback/    (trailing slash)
https://localhost:5173/auth/google/callback    (https instead of http)
http://127.0.0.1:5173/auth/google/callback     (use localhost, not 127.0.0.1)
http://localhost:3000/auth/google/callback     (wrong port)
```

✅ **Correct:**
```
http://localhost:5173/auth/google/callback
```

### Step 5: Multiple URIs Add Karein (Optional)

Agar aap different ports use karte hain, to multiple URIs add kar sakte hain:

```
http://localhost:5173/auth/google/callback
http://localhost:3000/auth/google/callback
http://localhost:5174/auth/google/callback
```

### Step 6: Save and Test

1. **Save** button click karein
2. Browser cache clear karein (Ctrl+Shift+Delete)
3. Phir se Google Connect try karein

## Quick Fix Checklist

- [ ] Google Cloud Console → APIs & Services → Credentials
- [ ] OAuth 2.0 Client ID click karein
- [ ] "Authorized redirect URIs" section check karein
- [ ] Add: `http://localhost:5173/auth/google/callback`
- [ ] No trailing slash
- [ ] Use `http` not `https`
- [ ] Save karein
- [ ] Browser cache clear karein
- [ ] Phir se try karein

## Verify Current Port

Agar aapko sure nahi hai ki aapka frontend kis port par run ho raha hai:

1. Browser mein app open karein
2. Address bar check karein
3. Port number note karein (usually `5173` for Vite)

Ya terminal mein check karein:
```bash
cd frontend
npm run dev
```

Output mein port number dikhega:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Production Setup

Production ke liye, apni domain ka redirect URI add karein:

```
https://yourdomain.com/auth/google/callback
```

**Important:** Production mein `https` use karein, not `http`.

## Still Not Working?

1. **Check Browser Console:**
   - F12 press karein
   - Console tab check karein
   - Koi error message dikh raha hai?

2. **Check Network Tab:**
   - Network tab open karein
   - Google OAuth request check karein
   - Redirect URI verify karein

3. **Verify Environment Variables:**
   - `frontend/.env` mein check karein:
     ```env
     VITE_GOOGLE_CLIENT_ID=your-client-id
     ```
   - `backend/.env` mein check karein:
     ```env
     GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
     ```

4. **Wait a Few Minutes:**
   - Google Cloud Console changes ko apply hone mein thoda time lag sakta hai
   - 2-3 minutes wait karein aur phir try karein

## Alternative: Use Exact URL from Code

Agar aapko sure nahi hai, to code se exact URL copy karein:

1. `frontend/src/pages/Settings.tsx` open karein
2. Line 56 check karein:
   ```typescript
   const redirectUri = `${window.location.origin}/auth/google/callback`;
   ```
3. Browser console mein yeh run karein:
   ```javascript
   console.log(window.location.origin + '/auth/google/callback');
   ```
4. Output ko copy karein aur Google Console mein add karein

---

**Most Common Fix:** Simply add `http://localhost:5173/auth/google/callback` to Authorized redirect URIs in Google Cloud Console and save!

