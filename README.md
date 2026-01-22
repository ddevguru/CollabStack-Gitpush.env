# Collaborative IDE - Real-time Code Editor

A full-featured, browser-based collaborative code editor built with PERN stack (PostgreSQL, Express, React, Node.js). Features real-time multi-user editing, GitHub/Google Drive integration, multi-language code execution, and team collaboration tools.

## Features

### Core Features
- **Real-time Collaborative Editing**: Multi-user live editing with operational transform, live cursors, and presence indicators
- **VS Code-like Editor**: Monaco Editor with syntax highlighting, multi-language support, and IntelliSense
- **Team & Project Management**: Create teams, invite members, manage projects with role-based access
- **Multi-language Code Execution**: Run code in JavaScript, Python, Java, C, C++ with sandboxed execution
- **GitHub Integration**: 
  - OAuth authentication
  - Auto-create repositories
  - Branch management (main, member branches)
  - Leader-controlled push policies
  - Auto/manual sync modes
- **Google Drive Integration**:
  - OAuth authentication
  - Project folder creation
  - Auto/manual sync modes
  - Export projects as ZIP

### 🚀 **CodeCompute Hub - Unique Differentiating Features**
- **Compute Credits System**: Transparent credit-based billing with PostgreSQL ledger
- **GPU Job Scheduling**: Calendar-based GPU time booking (like scheduling meetings)
- **Distributed Compute**: Queue jobs for execution across institutional GPU clusters
- **Academic Integrity**: Exam mode, plagiarism detection framework, activity logging
- **Three-Sided Marketplace**: Users, Institutions, and Enterprise tiers
- **Payment Integration**: Subscription plans with mock payment processing

### Collaboration Features
- **Real-time Chat**: In-editor chat panel for team communication
- **Live Cursors**: See where team members are editing
- **File Presence**: Track which files team members are viewing
- **Session Management**: Join/leave rooms, track active users

### Additional Features
- **Task Management**: Kanban-style todo lists per project
- **Dark/Light Theme**: Toggle between themes
- **File Explorer**: Hierarchical file tree with create/delete
- **Terminal/Output**: Built-in terminal for code execution
- **Branch Control**: Visual branch management with GitHub sync

## Tech Stack

### Backend
- **Node.js** + **Express**: REST API server
- **Socket.IO**: Real-time WebSocket communication
- **PostgreSQL** + **Prisma**: Database and ORM
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **Axios**: HTTP client for external APIs

### Frontend
- **React** + **TypeScript**: UI framework
- **Vite**: Build tool
- **Monaco Editor**: VS Code editor component
- **Socket.IO Client**: Real-time communication
- **Zustand**: State management
- **TailwindCSS**: Styling
- **React Router**: Routing

## Prerequisites

- Node.js 18+ and npm/pnpm
- PostgreSQL 15+
- Docker (optional, for containerized deployment)
- GitHub OAuth App (for GitHub integration)
- Google Cloud Project (for Google Drive integration)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd collaborative-ide
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Set up environment variables

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/collaborative_ide"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3000
FRONTEND_URL="http://localhost:5173"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback"

# Optional: Code Execution
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_API_KEY="your-judge0-api-key"
```

**Frontend** (`frontend/.env`):
```env
# For development, leave VITE_API_URL unset (Vite proxy handles /api)
# For production, set: VITE_API_URL=https://your-backend-url.onrender.com/api
VITE_GITHUB_CLIENT_ID=your-github-client-id
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Set up database

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database with test data
npm run seed
```

### 5. Start development servers

**Option 1: Run separately**

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Option 2: Run with Docker Compose**

```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Usage

### Getting Started

1. **Register/Login**: Create an account or login with GitHub/Google
2. **Create Team**: Create a team and invite members
3. **Create Project**: Create a new project under a team
4. **Start Coding**: Open files, edit code, and collaborate in real-time

### GitHub Integration

1. **Connect Account**: Go to Settings > Integrations > Connect GitHub
2. **Create Repository**: As team leader, create a GitHub repo for your project
3. **Manage Branches**: 
   - Main branch: Only leader can push
   - Member branches: Auto-created as `member/{username}`
   - Push modes: Auto or Manual per member
4. **Sync**: Use "Sync" button to push changes to GitHub

### Google Drive Integration

1. **Connect Account**: Go to Settings > Integrations > Connect Google Drive
2. **Create Folder**: Create a Drive folder for your project
3. **Sync Modes**:
   - Auto: Syncs on save/run events
   - Manual: Use "Sync to Drive" button
4. **Export**: Export project as ZIP to Drive

### Code Execution

1. **Select Language**: Choose from JavaScript, Python, Java, C, C++
2. **Write Code**: Write code in the terminal panel
3. **Add Input**: Optionally provide stdin input
4. **Run**: Click "Run" to execute code
5. **View Output**: See output, errors, and execution time

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/github/callback` - GitHub OAuth callback
- `POST /api/auth/google/callback` - Google OAuth callback

### Teams
- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create team
- `GET /api/teams/:id` - Get team details
- `POST /api/teams/:id/members` - Add team member

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `GET /api/projects/room/:roomId` - Get project by room ID

### Files
- `GET /api/files/:projectId` - Get project files
- `POST /api/files/:projectId` - Create file
- `PUT /api/files/:projectId/:fileId` - Update file
- `DELETE /api/files/:projectId/:fileId` - Delete file

### Code Execution
- `POST /api/runs/:projectId` - Execute code
- `GET /api/runs/:projectId` - Get run history

### GitHub
- `POST /api/github/connect` - Connect GitHub account
- `POST /api/github/projects/:projectId/repo` - Create GitHub repo
- `POST /api/github/projects/:projectId/sync` - Sync project to GitHub
- `POST /api/github/projects/:projectId/push` - Push to branch

### Google Drive
- `POST /api/drive/connect` - Connect Google Drive
- `POST /api/drive/projects/:projectId/folder` - Create Drive folder
- `POST /api/drive/projects/:projectId/sync` - Sync project to Drive

## Socket.IO Events

### Client → Server
- `room:join` - Join project room
- `room:leave` - Leave room
- `file:open` - Open file
- `cursor:update` - Update cursor position
- `edit` - Text edit operation
- `chat:message` - Send chat message
- `run:request` - Request code execution

### Server → Client
- `room:users` - List of users in room
- `user:joined` - User joined room
- `user:left` - User left room
- `file:opened` - File opened by user
- `cursor:updated` - Cursor position updated
- `edit` - Remote edit received
- `chat:message` - Chat message received
- `run:started` - Code execution started
- `run:completed` - Code execution completed

## Database Schema

Key models:
- **User**: Authentication, OAuth tokens
- **Team**: Team management, leader/members
- **Project**: Projects, settings, integrations
- **File**: File tree, content
- **Branch**: Git branch mapping
- **Session**: Active user sessions
- **Run**: Code execution history
- **Task**: Project tasks/todos
- **Comment**: File/project comments
- **SessionEvent**: Event logging for playback

## Development

### Project Structure

```
collaborative-ide/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # Socket.IO handlers
│   │   ├── middleware/    # Express middleware
│   │   └── scripts/        # Utility scripts
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── store/         # State management
│   │   ├── services/     # API clients
│   │   └── App.tsx
│   └── package.json
└── docker-compose.yml
```

### Running Tests

```bash
# Backend tests (when implemented)
cd backend
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Deployment

### Render Deployment (Recommended)

**Quick Deploy to Render:** See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for a complete guide.

**Quick Start:**
1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New +"** → **"Blueprint"**
4. Connect your repository (Render will detect `render.yaml`)
5. Update environment variables and deploy!

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build frontend: `cd frontend && npm run build`
2. Build backend: `cd backend && npm run build`
3. Set production environment variables
4. Run migrations: `cd backend && npm run prisma:migrate deploy`
5. Start backend: `cd backend && npm start`
6. Serve frontend build with nginx/apache

## Security Considerations

- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt
- OAuth tokens are encrypted in database
- Rate limiting on API endpoints (recommended)
- CORS configured for frontend origin
- Input validation on all endpoints
- SQL injection protection via Prisma
- XSS protection via React's built-in escaping

## Limitations & Future Improvements

### Current Limitations
- Operational Transform implementation is simplified (production should use proper OT/CRDT library)
- Code execution uses Judge0 API or basic Node.js (Docker sandbox not fully implemented)
- No file upload/download UI
- No video/voice call integration
- No session recording/playback UI
- Limited conflict resolution

### Planned Features
- Full CRDT implementation for better conflict resolution
- Docker-based code execution sandbox
- File upload/download
- Session recording and playback
- Video/voice calls via WebRTC
- AI code suggestions
- Linting and formatting integration
- Public read-only share links
- Interview/classroom modes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using PERN Stack**

