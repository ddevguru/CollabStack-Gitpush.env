# Complete Setup Guide - CollabStack IDE

## ✅ Fixed Issues

### 1. AI Chat Error - FIXED ✅
- **Problem**: `conversation is not defined` error
- **Fix**: Fixed variable reference in `backend/src/controllers/aiController.ts`
- **Status**: Working now

### 2. Run Button Not Showing - FIXED ✅
- **Problem**: Run button not appearing next to "Web" dropdown
- **Fix**: 
  - Fixed API route from `/runs/${runId}` to `/runs/${projectId}/${runId}`
  - Updated PlatformExecution component to always show for React projects
  - Default platform set to 'web' if platforms not loaded
- **Status**: Run button now visible and working

### 3. Execution Results Error - FIXED ✅
- **Problem**: "Failed to get execution results" error
- **Fix**: Corrected API endpoint in RunButton and PlatformExecution components
- **Status**: Execution polling now works correctly

### 4. Socket Disconnection - FIXED ✅
- **Problem**: Socket disconnecting frequently
- **Fix**: Improved error handling in socket connections
- **Status**: More stable connections

## 📋 Setup Instructions

### 1. Google OAuth Setup (Required for Calendar & Meet)

**See `GOOGLE_SETUP_GUIDE.md` for detailed steps**

Quick steps:
1. Create Google Cloud Project
2. Enable APIs: Drive, Calendar, Meet
3. Create OAuth 2.0 credentials
4. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
   ```
5. Add to `frontend/.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id
   ```

### 2. OpenAI API Setup (Required for AI Assistant)

**See `OPENAI_SETUP_GUIDE.md` for detailed steps**

Quick steps:
1. Get API key from https://platform.openai.com/api-keys
2. Add credits to your account ($5 minimum)
3. Add to `backend/.env`:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```
4. Restart backend server

### 3. Environment Variables Checklist

**Backend `.env` file:**
```env
# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# Judge0 RapidAPI (for code execution)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=92df0cb268msh65c9330a67ca10fp18292fjsncdc06451c33c

# SMTP (for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Frontend `.env` file:**
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GITHUB_CLIENT_ID=your-github-client-id
```

## 🚀 How to Use

### Running Code

1. **For React Projects:**
   - Open any `.jsx` or `.tsx` file
   - You'll see "Platform Execution" section above editor
   - Select "Web" platform
   - Click "Run" button
   - Output will appear below

2. **For Other Files:**
   - Open file (`.js`, `.py`, `.java`, etc.)
   - Click "Run" button in toolbar (next to file name)
   - Output will show in terminal or execution panel

### AI Assistant

1. Click "AI" tab in sidebar
2. Type your question
3. AI will respond with code help, explanations, debugging tips

### Google Calendar & Meet

1. Go to Settings → Connect Google
2. Grant permissions
3. Now you can:
   - Schedule Google Meet sessions
   - Add calendar reminders
   - Mark important dates

## 🔧 Troubleshooting

### Run Button Not Showing
- Make sure file is not a directory
- Check that file has a runnable extension (`.js`, `.jsx`, `.ts`, `.tsx`, `.py`, etc.)
- Refresh the page

### "Failed to get execution results"
- Check backend is running on port 3000
- Check browser console for errors
- Verify run was created successfully

### Google Connection Not Working
- Verify redirect URI matches exactly in Google Console
- Check `.env` files have correct credentials
- Make sure you're logged in before connecting

### AI Assistant Not Responding
- Check OpenAI API key is set in backend `.env`
- Verify you have credits in OpenAI account
- Check backend logs for API errors

### Socket Disconnections
- Check internet connection
- Verify backend server is running
- Refresh page to reconnect

## 📝 Notes

- React projects default to "Web" platform
- Execution uses Judge0 API or local Node.js (for JavaScript)
- AI uses GPT-4 by default (can fallback to GPT-3.5-turbo)
- All features require proper environment setup

## 🎯 Next Steps

1. Set up Google OAuth (see `GOOGLE_SETUP_GUIDE.md`)
2. Set up OpenAI API (see `OPENAI_SETUP_GUIDE.md`)
3. Test Run button with a React project
4. Test AI Assistant
5. Connect Google account and test Calendar/Meet features

---

**All issues have been fixed!** 🎉

If you encounter any problems, check the troubleshooting section or the detailed setup guides.

