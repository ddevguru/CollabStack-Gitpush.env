# Fix Error 403: access_denied

## Error Message
```
Error 403: access_denied
Collaborative IDE has not completed the Google verification process. 
The app is currently being tested, and can only be accessed by developer-approved testers.
```

## Problem
Google OAuth app **Testing** mode mein hai, aur aapka email **Test Users** list mein nahi hai.

## Solution: Add Test Users

### Step 1: Google Cloud Console Mein Jayein

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Apna project select karein
3. **APIs & Services** → **OAuth consent screen**

### Step 2: Test Users Section Mein Jayein

1. OAuth consent screen page par scroll karein
2. **"Test users"** section dhundhein
3. Ya phir left sidebar mein **"Test users"** tab click karein

### Step 3: Apna Email Add Karein

1. **"+ ADD USERS"** button click karein
2. Apna email address enter karein:
   ```
   deepakm7778@gmail.com
   ```
3. **"Add"** button click karein
4. **"Save"** button click karein (agar page ke bottom par ho)

### Step 4: Verify Test Users Added

Aapko apna email list mein dikhna chahiye:
- ✅ `deepakm7778@gmail.com`

### Step 5: Browser Cache Clear Karein

1. Browser cache clear karein (Ctrl+Shift+Delete)
2. Ya incognito/private window mein try karein
3. Phir se Google Connect try karein

## Detailed Steps with Screenshots Guide

### Method 1: Via OAuth Consent Screen

1. **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. Page par scroll karein to **"Test users"** section
3. Click **"+ ADD USERS"**
4. Email add karein: `deepakm7778@gmail.com`
5. Click **"Add"**
6. Click **"Save"** (agar save button ho)

### Method 2: Via Test Users Tab

1. **OAuth consent screen** page par
2. Left sidebar mein **"Test users"** tab click karein
3. **"+ ADD USERS"** button click karein
4. Email add karein
5. Save karein

## Multiple Users Add Karein

Agar aapko multiple users add karne hain:

1. **"+ ADD USERS"** click karein
2. Multiple emails add kar sakte hain (comma-separated ya line-by-line)
3. Example:
   ```
   user1@gmail.com
   user2@gmail.com
   user3@gmail.com
   ```

## Important Notes

### Testing Mode Limitations

- ✅ **Testing Mode:** Sirf test users hi access kar sakte hain
- ✅ **Development ke liye perfect:** No verification required
- ❌ **Production:** Agar public access chahiye, to app publish karna padega

### Publishing App (Optional - For Production)

Agar aapko public access chahiye (sabhi users ke liye):

1. **OAuth consent screen** → **"PUBLISH APP"** button click karein
2. Google verification process complete karna padega
3. **Warning:** Verification process complex hai aur time lagta hai
4. **Recommendation:** Development ke liye Testing mode hi use karein

## Quick Fix Checklist

- [ ] Google Cloud Console → APIs & Services → OAuth consent screen
- [ ] Test users section mein jayein
- [ ] "+ ADD USERS" button click karein
- [ ] Email add karein: `deepakm7778@gmail.com`
- [ ] Add button click karein
- [ ] Save karein
- [ ] Browser cache clear karein
- [ ] Phir se Google Connect try karein

## Still Not Working?

### Check These:

1. **Email Correct Hai?**
   - Verify karein ki exact email add kiya hai
   - No typos
   - Same email use kar rahe hain jo Google account mein hai

2. **Test Users List Mein Hai?**
   - OAuth consent screen → Test users section check karein
   - Apna email list mein dikhna chahiye

3. **Wait Karein:**
   - Changes apply hone mein 1-2 minutes lag sakte hain
   - Thoda wait karein aur phir try karein

4. **Browser Cache:**
   - Hard refresh karein (Ctrl+F5)
   - Ya incognito window use karein

5. **Different Browser:**
   - Agar same issue ho, to different browser try karein

## Current Request Details

Aapke request details:
```
access_type=offline
scope=https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid
response_type=code
redirect_uri=http://localhost:5173/auth/google/callback
prompt=consent
client_id=405741706288-40lcm2o16a42j8c8nmhlho8gko5l382u.apps.googleusercontent.com
```

**Yeh sab sahi hai!** Bas test user add karna hai.

## Summary

**Problem:** App Testing mode mein hai, test user nahi hai  
**Solution:** `deepakm7778@gmail.com` ko test users mein add karein  
**Time:** 2 minutes  
**Result:** Google Connect kaam karega! ✅

---

**Quick Action:** Google Cloud Console → OAuth consent screen → Test users → Add `deepakm7778@gmail.com` → Save → Try again!

