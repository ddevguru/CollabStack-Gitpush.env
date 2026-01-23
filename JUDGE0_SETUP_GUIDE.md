# Judge0 API Setup Guide (RapidAPI)

## Overview

Judge0 API code execution ke liye use hota hai. Yeh 50+ programming languages support karta hai.

## Step 1: Get RapidAPI Key

1. Go to [RapidAPI Judge0 Page](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Sign up ya Login karein
3. Click **"Subscribe to Test"** (Free tier available)
4. Go to **"Endpoints"** → **"Code Snippets"**
5. Copy your **X-RapidAPI-Key**:
   - Example: `92df0cb268msh65c9330a67ca10fp18292fjsncdc06451c33c`

## Step 2: Configure Backend

Add to `backend/.env`:

```env
# Judge0 RapidAPI Configuration
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=92df0cb268msh65c9330a67ca10fp18292fjsncdc06451c33c
```

**Important:**
- Replace `92df0cb268msh65c9330a67ca10fp18292fjsncdc06451c33c` with your actual RapidAPI key
- No quotes around the key
- No spaces before/after `=`

## Step 3: Restart Backend Server

```bash
cd backend
npm run dev
```

## Step 4: Test Code Execution

1. Open any project
2. Create a test file (e.g., `test.js`, `test.py`)
3. Write some code:
   ```javascript
   // test.js
   console.log("Hello from Judge0!");
   ```
4. Click **Run** button
5. Check output in terminal/execution panel

## Supported Languages

| Language | Language ID | Status |
|----------|-------------|--------|
| JavaScript (Node.js) | 63 | ✅ Supported |
| TypeScript | 74 | ✅ Supported |
| Python 3 | 71 | ✅ Supported |
| Java | 62 | ✅ Supported |
| C++ | 54 | ✅ Supported |
| C | 50 | ✅ Supported |
| Go | 60 | ✅ Supported |
| Rust | 73 | ✅ Supported |
| PHP | 68 | ✅ Supported |
| Ruby | 72 | ✅ Supported |
| Swift | 83 | ✅ Supported |
| Kotlin | 78 | ✅ Supported |
| Dart | 69 | ✅ Supported |
| R | 80 | ✅ Supported |
| Scala | 81 | ✅ Supported |
| Bash | 46 | ✅ Supported |
| PowerShell | 84 | ✅ Supported |

## How It Works

1. **Code Submission:**
   - User clicks "Run" button
   - Code is sent to Judge0 API via RapidAPI
   - Judge0 returns a submission token

2. **Status Polling:**
   - Backend polls Judge0 every 1 second
   - Checks if execution is complete
   - Maximum 30 attempts (30 seconds timeout)

3. **Result Display:**
   - Output is shown in terminal/execution panel
   - Errors are displayed if execution fails
   - Execution time and memory usage are tracked

## API Endpoints Used

### 1. Create Submission
```
POST https://judge0-ce.p.rapidapi.com/submissions
Headers:
  X-RapidAPI-Key: your-api-key
  X-RapidAPI-Host: judge0-ce.p.rapidapi.com
Body:
  {
    "source_code": "console.log('Hello');",
    "language_id": 63,
    "stdin": ""
  }
```

### 2. Get Submission Result
```
GET https://judge0-ce.p.rapidapi.com/submissions/{token}
Headers:
  X-RapidAPI-Key: your-api-key
  X-RapidAPI-Host: judge0-ce.p.rapidapi.com
```

## Troubleshooting

### Error: "Judge0 API key not configured"
- Check `backend/.env` file has `JUDGE0_API_KEY` set
- Verify no quotes around the key
- Restart backend server after adding key

### Error: "Invalid API key"
- Verify RapidAPI key is correct
- Check if RapidAPI subscription is active
- Make sure you're using the correct key from RapidAPI dashboard

### Error: "Rate limit exceeded"
- Free tier has rate limits
- Wait a few minutes and try again
- Consider upgrading RapidAPI plan

### Code execution timeout
- Default timeout is 30 seconds
- For longer executions, increase `maxAttempts` in `compileService.ts`
- Some languages take longer to compile/run

### Language not supported
- Check if language is in `languageMap` in `compileService.ts`
- Add language ID if missing (see Judge0 documentation)
- Default fallback is JavaScript (ID: 63)

## Rate Limits (Free Tier)

- **Requests per month:** Limited (check RapidAPI dashboard)
- **Concurrent requests:** Limited
- **Response time:** May be slower during peak hours

## Production Considerations

1. **Error Handling:**
   - Always handle API errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging

2. **Rate Limiting:**
   - Implement request queuing for high traffic
   - Cache results when possible
   - Monitor API usage

3. **Security:**
   - Never expose API key in frontend
   - Keep API key in `.env` file (not in git)
   - Use environment variables in production

## Alternative: Self-Hosted Judge0

If you want to self-host Judge0 (no rate limits):

1. Deploy Judge0 using Docker
2. Update `JUDGE0_API_URL` in `.env`
3. Remove `X-RapidAPI-Key` header
4. Use standard Judge0 API endpoints

See: https://github.com/judge0/judge0

---

**Your RapidAPI Key:** `92df0cb268msh65c9330a67ca10fp18292fjsncdc06451c33c`

Add this to `backend/.env` and restart the server!

