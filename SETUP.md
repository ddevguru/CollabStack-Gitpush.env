# Quick Setup Guide

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- GitHub OAuth App (optional, for GitHub integration)
- Google Cloud Project (optional, for Drive integration)

## Step-by-Step Setup

### 1. Database Setup

```bash
# Start PostgreSQL (if not running)
# On macOS with Homebrew:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql

# Create database
createdb collaborative_ide
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set:
# - DATABASE_URL
# - JWT_SECRET

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed test data
npm run seed

# Start backend
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Set VITE_API_URL to backend URL

# Start frontend
npm run dev
```

### 4. OAuth Setup (Optional)

#### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:5173/auth/github/callback`
4. Copy Client ID and Secret to `.env` files

#### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Set redirect URI: `http://localhost:5173/auth/google/callback`
6. Copy Client ID and Secret to `.env` files

### 5. Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

### 6. Test Account

If you ran the seed script:
- Email: `test@example.com`
- Password: `password123`

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env`
- Check PostgreSQL logs

### Port Already in Use
- Change PORT in backend `.env`
- Update VITE_API_URL in frontend `.env`

### Prisma Migration Issues
- Delete `backend/prisma/migrations` folder
- Run `npm run prisma:migrate` again

### Socket.IO Connection Issues
- Check CORS settings in `backend/src/server.ts`
- Verify FRONTEND_URL matches your frontend URL

## Next Steps

1. Create your account or login
2. Create a team
3. Create a project
4. Start coding!

For detailed documentation, see [README.md](./README.md)

