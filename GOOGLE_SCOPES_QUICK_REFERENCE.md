# Google OAuth Scopes - Quick Reference

## Required Scopes for CollabStack IDE

Yeh scopes Google Cloud Console ke OAuth consent screen mein add karne hain:

### 1. Google Drive Access
```
https://www.googleapis.com/auth/drive.file
```
**Purpose:** Files ko Google Drive mein upload/sync karne ke liye
**API:** Google Drive API

### 2. Google Calendar Access
```
https://www.googleapis.com/auth/calendar
```
**Purpose:** Calendar events read/write karne ke liye
**API:** Google Calendar API

### 3. Google Calendar Events
```
https://www.googleapis.com/auth/calendar.events
```
**Purpose:** Calendar events create/edit/delete karne ke liye
**API:** Google Calendar API

### 4. User Email
```
https://www.googleapis.com/auth/userinfo.email
```
**Purpose:** User ka email address access karne ke liye
**API:** Google+ API / OAuth2 API

### 5. User Profile
```
https://www.googleapis.com/auth/userinfo.profile
```
**Purpose:** User ka basic profile information access karne ke liye
**API:** Google+ API / OAuth2 API

## How to Add Scopes in Google Cloud Console

### Method 1: Via OAuth Consent Screen (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **OAuth consent screen**
3. Click on your app
4. Go to **Scopes** tab
5. Click **"Add or Remove Scopes"**
6. Search box mein scope name type karein (e.g., `drive.file`)
7. Checkbox select karein
8. Click **Update**
9. Repeat for all 5 scopes

### Method 2: Manual Entry

1. **OAuth consent screen** → **Scopes** tab
2. Click **"Manually add scopes"** (bottom of page)
3. Copy-paste each scope one by one:
   ```
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```
4. Click **Add to Table**
5. Click **Update**

## Verify Scopes Are Added

After adding, you should see these 5 scopes in the list:

✅ `.../auth/drive.file`  
✅ `.../auth/calendar`  
✅ `.../auth/calendar.events`  
✅ `.../auth/userinfo.email`  
✅ `.../auth/userinfo.profile`

## Troubleshooting

### Scopes Not Showing in Consent Screen
- Make sure you're on the **Scopes** tab
- Click **"Add or Remove Scopes"** button
- Use the search box to find scopes
- If still not showing, use manual entry method

### Scopes Not Requested During Login
- Check `frontend/src/pages/Settings.tsx` - scopes should be in the OAuth URL
- Verify scopes are added in OAuth consent screen
- Clear browser cache and try again

### "Invalid Scope" Error
- Verify scope URLs are exactly correct (no typos)
- Make sure APIs are enabled (Drive API, Calendar API)
- Check that scopes are added in OAuth consent screen

## Scope Permissions Explained

| Scope | What It Allows | Required For |
|-------|---------------|--------------|
| `drive.file` | Upload files to Drive, create folders | Google Drive sync |
| `calendar` | Read calendar events | Calendar integration |
| `calendar.events` | Create/edit/delete events | Google Meet scheduling |
| `userinfo.email` | Access user's email | User identification |
| `userinfo.profile` | Access user's name, photo | User profile display |

## Security Note

- These scopes give limited access (not full account access)
- `drive.file` only allows access to files created by the app
- Users will see these permissions when connecting
- Always request minimum required scopes

