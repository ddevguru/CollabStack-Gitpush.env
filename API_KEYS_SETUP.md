# API Keys Setup Guide (Hindi/English)

## GitHub OAuth Setup (GitHub OAuth सेटअप)

### Step 1: GitHub पर OAuth App बनाएं

1## GitHub OAuth App Setup (GitHub Connect करने के लिए)

**Important:** यह OAuth App setup **GitHub से connect करने** के लिए है, न कि सिर्फ login के लिए। इससे आपको GitHub API access मिलता है जो:
- GitHub पर automatically push करने के लिए
- Repositories create करने के लिए
- Branches manage करने के लिए
- Code sync करने के लिए

**Steps:**

1. **GitHub पर login करें** और https://github.com/settings/developers पर जाएं
2. **"New OAuth App"** button पर click करें
3. Form भरें:
   - **Application name**: `Collaborative IDE` (या कोई भी नाम)
   - **Homepage URL**: `http://localhost:5173` (development के लिए)
   - **Authorization callback URL**: `http://localhost:5173/auth/github/callback`
   - **Application description**: (Optional) आप description add कर सकते हैं
4. **"Register application"** button click करें
5. **Client ID** और **Client Secret** copy करें (ये GitHub API access के लिए use होंगे)

### Step 2: Client ID और Secret Copy करें

1. OAuth App create होने के बाद, आपको **Client ID** और **Client Secret** दिखेगा
2. **Client Secret** को copy करें (यह सिर्फ एक बार दिखता है!)
3. अगर Secret भूल गए, तो **"Generate a new client secret"** से नया बना सकते हैं

### Step 3: Environment Variables में Add करें

**Backend `.env` file में:**
```env
GITHUB_CLIENT_ID="your-client-id-here"
GITHUB_CLIENT_SECRET="your-client-secret-here"
```

**Frontend `.env` file में:**
```env
VITE_GITHUB_CLIENT_ID="your-client-id-here"
```

### Production के लिए:
- **Homepage URL**: `https://yourdomain.com`
- **Authorization callback URL**: `https://yourdomain.com/auth/github/callback`

---

## Google Drive OAuth Setup (Google Drive OAuth सेटअप)

### Step 1: Google Cloud Console में Project बनाएं

1. https://console.cloud.google.com/ पर जाएं
2. **"Select a project"** dropdown से **"New Project"** select करें
3. Project name दें (जैसे: `Collaborative IDE`)
4. **"Create"** button click करें

### Step 2: OAuth Consent Screen Configure करें

1. Left sidebar से **"APIs & Services"** > **"OAuth consent screen"** select करें
2. **User Type** select करें:
   - **External** (अगर public app है)
   - **Internal** (अगर Google Workspace के लिए है)
3. **App information** भरें:
   - **App name**: `Collaborative IDE`
   - **User support email**: आपका email
   - **Developer contact information**: आपका email
4. **"Save and Continue"** click करें
5. **Scopes** section में:
   - **"ADD OR REMOVE SCOPES"** button click करें (यह एक बड़ा button है, page के middle में)
   - **"Manually add scopes"** tab select करें
   - निम्नलिखित scopes manually add करें (एक-एक करके):
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - हर scope add करने के बाद **"ADD TO TABLE"** button click करें
   - सभी scopes add होने के बाद **"UPDATE"** button click करें
   - **"SAVE AND CONTINUE"** click करें
   
   **Note:** अगर Scopes section नहीं दिख रहा, तो:
   - पहले **"Save and Continue"** click करें
   - फिर **"Back"** button से वापस आएं
   - अब Scopes section दिखेगा
7. **Test users** add करें (अगर External app है और testing कर रहे हैं)
8. **"Save and Continue"** click करें

### Step 3: OAuth 2.0 Credentials बनाएं

1. Left sidebar से **"APIs & Services"** > **"Credentials"** select करें
2. **"+ CREATE CREDENTIALS"** > **"OAuth client ID"** select करें
3. **Application type**: **"Web application"** select करें
4. **Name**: `Collaborative IDE Web Client` (या कोई नाम)
5. **Authorized JavaScript origins** में add करें:
   - `http://localhost:5173` (development)
   - `http://localhost:3000` (backend, अगर needed)
6. **Authorized redirect URIs** में add करें:
   - `http://localhost:5173/auth/google/callback`
7. **"CREATE"** button click करें

### Step 4: Client ID और Secret Copy करें

1. Dialog box में **Client ID** और **Client Secret** दिखेगा
2. दोनों को copy करें (Secret सिर्फ एक बार दिखता है!)

### Step 5: Google Drive API Enable करें

1. Left sidebar से **"APIs & Services"** > **"Library"** select करें
2. Search box में **"Google Drive API"** search करें
3. **"Google Drive API"** select करें
4. **"ENABLE"** button click करें

### Step 6: Environment Variables में Add करें

**Backend `.env` file में:**
```env
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback"
```

**Frontend `.env` file में:**
```env
VITE_GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
```

### Production के लिए:
- **Authorized JavaScript origins**: `https://yourdomain.com`
- **Authorized redirect URIs**: `https://yourdomain.com/auth/google/callback`
- **GOOGLE_REDIRECT_URI**: `https://yourdomain.com/auth/google/callback`

---

## Judge0 API Setup (Optional - Code Execution के लिए)

### Step 1: RapidAPI Account बनाएं

1. https://rapidapi.com/ पर sign up करें
2. Email verify करें

### Step 2: Judge0 API Subscribe करें

1. https://rapidapi.com/judge0-official/api/judge0-ce पर जाएं
2. **"Subscribe to Test"** या paid plan select करें
3. Subscription complete करें

### Step 3: API Key Copy करें

1. Dashboard से **"My Apps"** > **"Default Application"** select करें
2. **"X-RapidAPI-Key"** value copy करें

### Step 4: Environment Variables में Add करें

**Backend `.env` file में:**
```env
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_API_KEY="your-rapidapi-key-here"
```

**Note:** Judge0 optional है। अगर नहीं add करते, तो JavaScript code execution Node.js से होगी।

---

## Quick Checklist (जल्दी Checklist)

### GitHub OAuth:
- [ ] GitHub OAuth App created
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Backend `.env` में `GITHUB_CLIENT_ID` और `GITHUB_CLIENT_SECRET` added
- [ ] Frontend `.env` में `VITE_GITHUB_CLIENT_ID` added

### Google Drive OAuth:
- [ ] Google Cloud Project created
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Google Drive API enabled
- [ ] Client ID और Secret copied
- [ ] Backend `.env` में `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` added
- [ ] Frontend `.env` में `VITE_GOOGLE_CLIENT_ID` added

### Judge0 (Optional):
- [ ] RapidAPI account created
- [ ] Judge0 API subscribed
- [ ] API key copied
- [ ] Backend `.env` में `JUDGE0_API_URL` और `JUDGE0_API_KEY` added

---

## Troubleshooting (समस्याओं का समाधान)

### GitHub OAuth Error:
- **"redirect_uri_mismatch"**: Callback URL check करें, exact match होना चाहिए
- **"invalid_client"**: Client ID और Secret check करें

### Google OAuth Error:
- **"redirect_uri_mismatch"**: Authorized redirect URIs में exact URL add करें
- **"access_denied"**: OAuth consent screen में test users add करें
- **"invalid_client"**: Client ID और Secret check करें

### Judge0 Error:
- **"401 Unauthorized"**: API key check करें
- **"403 Forbidden"**: Subscription status check करें

---

## Security Tips (सुरक्षा Tips)

1. **कभी भी API keys को Git में commit न करें**
2. `.env` files को `.gitignore` में add करें
3. Production में strong secrets use करें
4. OAuth redirect URIs को exact match करें
5. Client secrets को secure storage में रखें

---

## Support

अगर कोई problem है, तो:
1. Error message को carefully read करें
2. Console logs check करें
3. API documentation refer करें
4. GitHub issues में question post करें

