# OpenAI API Setup Guide for AI Assistant

## Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or login to your account
3. Go to **API Keys** section: https://platform.openai.com/api-keys
4. Click **+ Create new secret key**
5. Give it a name (e.g., "CollabStack IDE")
6. Copy the API key immediately (you won't be able to see it again!)

## Step 2: Add Credits to OpenAI Account

1. Go to **Billing** → **Payment methods**
2. Add a payment method
3. Add credits (minimum $5 recommended for testing)

## Step 3: Configure Backend

Add to `backend/.env`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Important:** Never commit this key to Git! It should be in `.env` which is in `.gitignore`

## Step 4: Restart Backend Server

```bash
cd backend
npm run dev
```

## Step 5: Test AI Assistant

1. Open any project
2. Click on **AI** tab in the toolbar
3. Ask a question like "Explain this code"
4. You should get a response from ChatGPT!

## Features Enabled

- **AI Chat**: Ask questions about your code
- **Code Explanation**: Get explanations for complex code
- **Debugging Help**: Get help fixing errors
- **Code Suggestions**: Get optimization tips
- **Best Practices**: Learn coding best practices

## Model Used

- Default: `gpt-4` (most capable)
- Fallback: `gpt-3.5-turbo` (faster, cheaper)
- You can change this in `backend/src/controllers/aiController.ts`

## Cost Information

- GPT-4: ~$0.03 per 1K input tokens, $0.06 per 1K output tokens
- GPT-3.5-turbo: ~$0.0015 per 1K input tokens, $0.002 per 1K output tokens
- Typical conversation: 500-2000 tokens (~$0.01-0.10 per conversation)

## Troubleshooting

### Error: "Invalid API key"
- Check that API key starts with `sk-`
- Verify no extra spaces in `.env` file
- Make sure key is active in OpenAI dashboard

### Error: "Insufficient quota"
- Add credits to your OpenAI account
- Check usage limits in OpenAI dashboard

### Error: "Rate limit exceeded"
- You've made too many requests
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

### No response / Timeout
- Check internet connection
- Verify OpenAI API is accessible
- Check backend logs for errors

