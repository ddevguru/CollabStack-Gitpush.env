# ChatGPT API Setup Guide

## Where to Place ChatGPT API Key

### For Local Development:

1. **Backend `.env` file:**
   - Location: `backend/.env`
   - Add the following line:
   ```env
   OPENAI_API_KEY=sk-your-chatgpt-api-key-here
   ```

2. **Example `.env` file structure:**
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret
   FRONTEND_URL=http://localhost:5173
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=...
   OPENAI_API_KEY=sk-your-chatgpt-api-key-here
   ```

### For Production (Render):

1. **Go to Render Dashboard:**
   - Navigate to your backend service
   - Click on "Environment" tab
   - Click "Add Environment Variable"

2. **Add the variable:**
   - **Key:** `OPENAI_API_KEY`
   - **Value:** Your ChatGPT API key (starts with `sk-`)
   - Click "Save Changes"

3. **Restart the service:**
   - After adding the environment variable, Render will automatically restart your service

### How to Get ChatGPT API Key:

1. **Go to OpenAI Platform:**
   - Visit: https://platform.openai.com/

2. **Sign in or Create Account:**
   - Use your ChatGPT Pro account credentials

3. **Navigate to API Keys:**
   - Click on your profile (top right)
   - Select "API keys"
   - Or go directly to: https://platform.openai.com/api-keys

4. **Create New Secret Key:**
   - Click "Create new secret key"
   - Give it a name (e.g., "CollabStack IDE")
   - Copy the key immediately (you won't see it again!)

5. **Add Credits (if needed):**
   - Go to Billing: https://platform.openai.com/account/billing
   - Add payment method and credits
   - Note: API usage is separate from ChatGPT Plus subscription

### Important Notes:

- **API Key Security:**
  - Never commit API keys to Git
  - Never share API keys publicly
  - Use environment variables only
  - The key starts with `sk-` and is about 51 characters long

- **Usage Costs:**
  - GPT-4: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
  - GPT-3.5-turbo: ~$0.0015 per 1K input tokens, ~$0.002 per 1K output tokens
  - Monitor usage at: https://platform.openai.com/usage

- **Rate Limits:**
  - Free tier: Limited requests per minute
  - Paid tier: Higher limits based on your plan

### Testing the Integration:

1. **Start your backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test AI Chat:**
   - Open your project in the IDE
   - Click "AI" button in toolbar
   - Type a message and send
   - You should get a response from ChatGPT

3. **Check Backend Logs:**
   - If you see errors, check the console
   - Common issues:
     - Invalid API key
     - Insufficient credits
     - Rate limit exceeded

### Fallback Behavior:

If the API key is not set or there's an error:
- The system will use a mock AI response
- You'll still see responses, but they won't be from ChatGPT
- Check backend logs for error messages

### Code Location:

The ChatGPT integration is in:
- **Backend:** `backend/src/controllers/aiController.ts`
- **Method:** `getAIResponse()`
- **API Endpoint:** `POST /api/ai/chat/:projectId`

The code automatically:
- Uses GPT-4 if API key is available
- Falls back to mock responses if not
- Handles errors gracefully

