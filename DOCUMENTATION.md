# CollabStack IDE - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Features in Detail](#features-in-detail)
6. [Why This Platform is Different](#why-this-platform-is-different)
7. [Usage Examples](#usage-examples)
8. [Setup Guide](#setup-guide)

---

## Project Overview

CollabStack IDE is a revolutionary collaborative development platform that combines real-time code editing, distributed code execution, AI assistance, and seamless integrations into a single unified workspace. Unlike traditional IDEs, CollabStack provides a "magical" experience where multiple developers can work together seamlessly, execute code on remote GPU clusters, and leverage AI assistance—all without managing infrastructure.

### Core Philosophy

The platform is built on the principle that **collaboration should be effortless** and **execution should be instant**. Instead of explaining architecture or showing diagrams, CollabStack visually proves that two people sitting far apart can code together and instantly use remote high-power computers without thinking about infrastructure.

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Monaco   │  │  Socket  │  │   AI     │  │ Design   │   │
│  │ Editor   │  │  Client  │  │  Chat    │  │ Canvas   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ WebSocket/HTTP
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Socket.IO│  │  Prisma  │  │  Judge0 │  │  OpenAI  │   │
│  │ Server   │  │   ORM    │  │   API   │  │   API   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Users   │  │ Projects │  │  Files  │  │  Runs    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Frontend**: React-based SPA with Monaco Editor for code editing
2. **Backend**: Express.js REST API + Socket.IO for real-time communication
3. **Database**: PostgreSQL with Prisma ORM
4. **External Services**: Judge0 (code execution), OpenAI (AI), Google APIs (Drive/Calendar)

---

## Database Schema

### Entity Relationship Diagram

```
User ──┬── Team (Leader)
       ├── TeamMember
       ├── Project (Creator)
       ├── Session
       ├── Run
       ├── ComputeJob
       ├── Design
       └── Otp

Team ──┬── Project (Owner)
       └── TeamMember

Project ──┬── File
          ├── Branch
          ├── Design
          ├── Session
          ├── Run
          ├── ComputeJob
          ├── Task
          ├── Comment
          └── CodeMetric
```

### Detailed Schema

#### User Model
```prisma
model User {
  id                 String          @id @default(cuid())
  email              String          @unique
  name               String
  avatar             String?
  passwordHash       String?
  authProviders      Json            @default("[]")
  githubToken        String?
  githubUsername     String?
  googleToken        String?
  googleRefreshToken String?
  isEmailVerified    Boolean         @default(false)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  
  // Relations
  createdProjects    Project[]
  createdTeams       Team[]
  sessions           Session[]
  runs               Run[]
  computeJobs        ComputeJob[]
  designs            Design[]
}
```

**Purpose**: Stores user authentication, profile, and OAuth tokens for GitHub/Google integrations.

**Example**:
```json
{
  "id": "cmkpl6fkn000nuimubx6t23rh",
  "email": "user@example.com",
  "name": "John Doe",
  "isEmailVerified": true,
  "githubUsername": "johndoe",
  "googleToken": "ya29.a0AfH6SMC..."
}
```

#### Project Model
```prisma
model Project {
  id                String             @id @default(cuid())
  name              String
  description       String?
  projectType       String?            // "react", "python", "java", etc.
  roomId            String             @unique
  ownerTeamId       String
  githubRepoName    String?
  githubRepoUrl     String?
  driveFolderId     String?
  driveSyncMode     DriveSyncMode      @default(OFF)
  settings          Json               @default("{}")
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  // Relations
  files             File[]
  branches          Branch[]
  sessions          Session[]
  runs              Run[]
  designs           Design[]
  computeJobs       ComputeJob[]
}
```

**Purpose**: Represents a coding project with all its files, settings, and integrations.

**Example**:
```json
{
  "id": "cmkqgd3ch001jm24jtfs7044p",
  "name": "My React App",
  "projectType": "react",
  "roomId": "room_abc123",
  "driveSyncMode": "AUTO",
  "githubRepoName": "my-react-app"
}
```

#### File Model
```prisma
model File {
  id          String   @id @default(cuid())
  projectId   String
  path        String
  content     String   @default("")
  isDirectory Boolean  @default(false)
  parentId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  project     Project  @relation(fields: [projectId], references: [id])
  
  @@unique([projectId, path])
}
```

**Purpose**: Stores all project files with their content. Supports nested directory structure.

**Example**:
```json
{
  "id": "file_123",
  "projectId": "cmkqgd3ch001jm24jtfs7044p",
  "path": "src/App.js",
  "content": "import React from 'react';\n\nfunction App() {\n  return <div>Hello</div>;\n}",
  "isDirectory": false
}
```

#### Session Model
```prisma
model Session {
  id         String   @id @default(cuid())
  projectId  String
  userId     String
  activeFile String?
  cursorPos  Json?
  joinedAt   DateTime @default(now())
  lastActive DateTime @updatedAt
  
  project    Project  @relation(fields: [projectId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  
  @@unique([projectId, userId])
}
```

**Purpose**: Tracks which users are currently active in a project and what file they're editing.

**Example**:
```json
{
  "id": "session_123",
  "projectId": "cmkqgd3ch001jm24jtfs7044p",
  "userId": "cmkpl6fkn000nuimubx6t23rh",
  "activeFile": "src/App.js",
  "cursorPos": { "line": 5, "column": 10 }
}
```

#### Run Model
```prisma
model Run {
  id        String    @id @default(cuid())
  projectId String
  userId    String
  language  String
  code      String
  stdin     String?
  status    RunStatus @default(PENDING)
  output    String?
  error     String?
  timeMs    Int?
  memoryKb  Int?
  createdAt DateTime  @default(now())
  
  project   Project   @relation(fields: [projectId], references: [id])
  user      User      @relation(fields: [userId], references: [id])
}
```

**Purpose**: Stores code execution history with results, timing, and resource usage.

**Example**:
```json
{
  "id": "run_123",
  "projectId": "cmkqgd3ch001jm24jtfs7044p",
  "language": "javascript",
  "status": "SUCCESS",
  "output": "Hello, World!\n",
  "timeMs": 150,
  "memoryKb": 2048
}
```

#### ComputeJob Model
```prisma
model ComputeJob {
  id            String              @id @default(cuid())
  projectId     String
  userId        String
  language      String
  code          String
  resourceType  ComputeResourceType @default(CPU)
  gpuType       String?
  status        ComputeJobStatus    @default(PENDING)
  clusterId     String?
  nodeId        String?
  computeHours  Float               @default(0)
  creditsUsed   Float               @default(0)
  output        String?
  error         String?
  createdAt     DateTime            @default(now())
  
  project       Project             @relation(fields: [projectId], references: [id])
  user          User                @relation(fields: [userId], references: [id])
}
```

**Purpose**: Manages distributed code execution on GPU/CPU clusters across regions.

**Example**:
```json
{
  "id": "job_123",
  "projectId": "cmkqgd3ch001jm24jtfs7044p",
  "resourceType": "GPU",
  "gpuType": "T4",
  "status": "COMPLETED",
  "clusterId": "stanford-gpu-cluster",
  "computeHours": 0.5,
  "creditsUsed": 2.5
}
```

#### Design Model
```prisma
model Design {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  name      String
  data      String   @default("[]")  // JSON array of shapes
  thumbnail String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  project   Project  @relation(fields: [projectId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}
```

**Purpose**: Stores Figma-like design canvas data with shapes, layers, and properties.

**Example**:
```json
{
  "id": "design_123",
  "projectId": "cmkqgd3ch001jm24jtfs7044p",
  "name": "Homepage Design",
  "data": "[{\"type\":\"rectangle\",\"x\":100,\"y\":100,\"width\":200,\"height\":150,\"fill\":\"#3B82F6\"}]"
}
```

### Enums

```prisma
enum DriveSyncMode {
  OFF
  AUTO
  MANUAL
}

enum RunStatus {
  PENDING
  RUNNING
  SUCCESS
  ERROR
  TIMEOUT
}

enum ComputeResourceType {
  CPU
  GPU
  MEMORY
}

enum ComputeJobStatus {
  PENDING
  QUEUED
  SCHEDULED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user with email verification.

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "otp": "123456",
    "message": "OTP sent to email"
  }
}
```

#### POST `/api/auth/verify-otp`
Verify OTP and complete registration.

**Request Body**:
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### POST `/api/auth/login`
Login with email and password.

#### POST `/api/auth/forgot-password`
Request password reset OTP.

#### POST `/api/auth/reset-password`
Reset password using OTP.

### Project Endpoints

#### POST `/api/projects`
Create a new project.

**Request Body**:
```json
{
  "name": "My Project",
  "description": "Project description",
  "projectType": "react"
}
```

#### GET `/api/projects`
Get all projects for the authenticated user.

#### GET `/api/projects/:id`
Get project details with files.

#### POST `/api/projects/:id/execute`
Execute a command in the project context.

**Request Body**:
```json
{
  "command": "npm install"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "output": "added 1300 packages...",
    "error": "",
    "exitCode": 0,
    "command": "npm install"
  }
}
```

### File Endpoints

#### GET `/api/files/:projectId`
Get all files for a project.

#### PUT `/api/files/:projectId/:fileId`
Update file content.

**Request Body**:
```json
{
  "content": "updated file content"
}
```

#### POST `/api/files/:projectId`
Create a new file.

### Chat Endpoints

#### POST `/api/chat/projects/:projectId/message`
Send a chat message.

#### GET `/api/chat/projects/:projectId/users`
Get active users in the project.

### AI Endpoints

#### POST `/api/ai/chat/:projectId`
Chat with AI assistant.

**Request Body**:
```json
{
  "message": "How do I implement authentication?"
}
```

### Google Integration Endpoints

#### POST `/api/drive/connect`
Connect Google Drive account.

#### POST `/api/drive/projects/:projectId/folder`
Create Drive folder for project.

#### POST `/api/meet/quick`
Create a quick Google Meet link.

---

## Features in Detail

### 1. Real-Time Code Collaboration

**How it works**:
- Users join a project room via Socket.IO
- Monaco Editor sends operational transforms (OT) for every edit
- Cursor positions are broadcast in real-time
- File open/close events notify all collaborators

**Technical Implementation**:
```typescript
// Backend: rooms.ts
socket.on('edit', async (data) => {
  // Apply operation to file
  // Broadcast to other users in room
  socket.to(roomId).emit('edit', { ...data, userName });
});

// Frontend: MonacoEditor.tsx
editor.onDidChangeModelContent(() => {
  socket.emit('edit', {
    roomId,
    projectId,
    fileId,
    operation: { type: 'insert', text: '...', position: 100 }
  });
});
```

### 2. Distributed Code Execution

**How it works**:
- User clicks "Run" button
- Code is sent to Judge0 API or custom execution service
- Execution happens on remote GPU/CPU clusters
- Output streams back in real-time
- Metrics (GPU usage, memory, region) are displayed

**Execution Flow**:
```
User → Frontend → Backend → Judge0 API / Docker Container
                              ↓
                         Remote Cluster
                              ↓
                    Output Stream → Backend → Frontend → User
```

### 3. AI Assistant

**How it works**:
- User sends message in AI chat
- Backend fetches recent project files for context
- Context + message sent to OpenAI GPT-4
- Response includes code suggestions and explanations

**Context Building**:
```typescript
const context = project.files
  .slice(0, 5)
  .map(f => `File: ${f.path}\n${f.content.substring(0, 500)}`)
  .join('\n\n');

const aiResponse = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: `Project context: ${context}` },
    { role: 'user', content: message }
  ]
});
```

### 4. Google Drive Auto-Sync

**How it works**:
- When `driveSyncMode` is `AUTO`, file saves trigger sync
- Files are uploaded to Google Drive maintaining folder structure
- Nested directories are created recursively
- Files are updated if they exist, created if new

**Sync Process**:
```typescript
// On file save
if (project.driveSyncMode === 'AUTO' && project.driveFolderId) {
  await driveService.syncProject(
    user.googleToken,
    project.driveFolderId,
    projectFiles,
    project.name
  );
}
```

### 5. Voice Calls & Voice Notes

**How it works**:
- WebRTC peer-to-peer connections for voice calls
- MediaRecorder API for voice note recording
- Base64 encoded audio sent via Socket.IO
- Real-time playback for all users

### 6. Design Canvas

**How it works**:
- Canvas-based drawing with HTML5 Canvas API
- Shapes stored as JSON in database
- Real-time collaboration via Socket.IO
- Export options: PNG, JPG, SVG

---

## Why This Platform is Different

### 1. **Real-Time Everything**
Unlike VS Code Live Share or CodeSandbox, CollabStack provides:
- **Real-time execution**: See code run on remote clusters as you type
- **Real-time output streaming**: Watch results appear line-by-line
- **Real-time metrics**: GPU usage, memory, CPU—all live
- **Real-time collaboration**: Not just editing—execution, design, chat

### 2. **Zero Infrastructure Management**
Traditional platforms require:
- Setting up development environments
- Managing dependencies
- Configuring build tools
- Deploying to servers

CollabStack provides:
- **Instant execution**: No setup, no configuration
- **Pre-warmed compute**: Zero latency execution
- **Auto-sync**: Files automatically sync to GitHub/Drive
- **Package management**: Run `npm install` directly in the IDE

### 3. **Distributed Compute Visualization**
Unlike traditional cloud IDEs:
- **Visual proof**: See exactly where your code is running
- **Multi-region**: Switch between regions for optimal performance
- **Transparency**: GPU usage, memory, cluster info—all visible
- **Intelligent routing**: System chooses best compute location

### 4. **Unified Workspace**
Instead of switching between tools:
- **Code + Design**: Edit code and design UI in the same workspace
- **Chat + Voice**: Communicate without leaving the IDE
- **Execute + Monitor**: Run code and see metrics simultaneously
- **AI + Context**: AI understands your entire project

### 5. **AI-First Architecture**
Unlike add-on AI features:
- **Project context**: AI sees all your files
- **Voice commands**: Speak to AI naturally
- **Code suggestions**: AI suggests based on project structure
- **Integrated workflow**: AI is part of the development flow

### 6. **Seamless Integrations**
Unlike manual integrations:
- **Auto-push**: Code automatically pushes to GitHub
- **Auto-sync**: Files sync to Google Drive
- **One-click meetings**: Generate Google Meet links instantly
- **Calendar integration**: Mark dates and set reminders

### 7. **Team Session Orchestration**
Unique features:
- **Join mid-execution**: See running code when you join
- **Session awareness**: Know who's doing what
- **Persistent sessions**: Rejoin without losing context
- **Activity tracking**: See what happened while you were away

---

## Usage Examples

### Example 1: Collaborative React Development

**Scenario**: Two developers working on a React app together.

1. **Developer A** creates a new React project
2. **Developer B** joins the project room
3. **Developer A** writes component code in `App.js`
4. **Developer B** sees the code appear in real-time
5. **Developer B** adds styling in `App.css`
6. **Developer A** runs `npm install` in terminal
7. Packages install and sync to database
8. **Developer A** clicks "Run" button
9. React app executes and displays output
10. Both developers see the result simultaneously

**Key Differentiator**: No need to set up local environment, install dependencies, or configure build tools. Everything happens in the cloud.

### Example 2: Distributed ML Model Training

**Scenario**: Training a machine learning model on remote GPU.

1. User writes Python code for model training
2. Selects "GPU" execution mode
3. Clicks "Run"
4. System routes to Stanford GPU cluster
5. Dashboard shows:
   - GPU utilization: 0% → 85%
   - Memory usage: 2GB → 12GB
   - Region: US-West
   - Cluster: stanford-gpu-cluster-01
6. Training output streams line-by-line
7. User sees loss values updating in real-time
8. Execution completes, credits deducted

**Key Differentiator**: Visual proof that code is running on remote GPU, not just local execution.

### Example 3: Multi-Language Project

**Scenario**: Full-stack project with multiple languages.

1. Create project with type "mern"
2. Backend files in `server/` (Node.js)
3. Frontend files in `client/` (React)
4. Run `npm install` in `server/` directory
5. Run `npm install` in `client/` directory
6. Execute backend: `node server/index.js`
7. Execute frontend: `npm start` in `client/`
8. Both run simultaneously in different terminal tabs

**Key Differentiator**: Multiple terminal tabs allow parallel execution without blocking.

### Example 4: Design + Code Workflow

**Scenario**: Designing UI and implementing it.

1. Open Design Canvas
2. Create UI mockup with shapes and text
3. Export design as PNG
4. Switch to code editor
5. Implement React components based on design
6. AI assistant suggests code based on design
7. Run code to see implementation
8. Iterate between design and code seamlessly

**Key Differentiator**: Design and code in the same workspace with AI assistance.

---

## Setup Guide

### Environment Variables

#### Backend `.env`
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/collabstack"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback"

# OpenAI
OPENAI_API_KEY="sk-..."

# Judge0 (RapidAPI)
JUDGE0_RAPIDAPI_KEY="your-judge0-rapidapi-key"

# SMTP (Email)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

#### Frontend `.env`
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### Database Setup

1. **Create PostgreSQL database**:
```sql
CREATE DATABASE collabstack;
```

2. **Run migrations**:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

3. **Verify all existing emails** (if needed):
```bash
npm run verify-emails
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable APIs:
   - Google Drive API
   - Google Calendar API
   - Google Meet API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5173/auth/google/callback`
6. Add test users (if in testing mode)

### Running the Application

**Development Mode**:
```bash
# Install all dependencies
npm run install:all

# Run both backend and frontend
npm run dev

# Or run separately
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:5173
```

**Production Mode**:
```bash
npm run build
# Deploy backend and frontend separately
```

---

## Key Technical Decisions

### Why Monaco Editor?
- Industry-standard (powers VS Code)
- Excellent TypeScript support
- Extensible architecture
- Real-time collaboration support

### Why Socket.IO?
- WebSocket with fallback to HTTP
- Room-based architecture
- Built-in reconnection handling
- Event-based communication

### Why Prisma?
- Type-safe database queries
- Automatic migrations
- Excellent developer experience
- PostgreSQL support

### Why Judge0 API?
- Supports 17+ languages
- Secure sandboxed execution
- RapidAPI integration
- Reliable and scalable

---

## Future Enhancements

1. **Mobile App**: Native mobile apps for iOS/Android
2. **Offline Mode**: Work offline and sync when online
3. **Plugin System**: Extensible plugin architecture
4. **More Integrations**: Slack, Discord, Jira
5. **Advanced AI**: Code generation, refactoring suggestions
6. **Video Calls**: Integrated video calling
7. **Screen Sharing**: Share screen during collaboration

---

## Troubleshooting

### Connection Reset Errors

**Problem**: `ERR_CONNECTION_RESET` during long-running commands.

**Solution**: 
- Ensure backend server is running
- Check timeout settings (default: 10 minutes)
- Verify network connectivity
- Check backend logs for errors

### npm install Not Syncing Files

**Problem**: Packages install but files don't appear in file explorer.

**Solution**:
- Check backend logs for sync errors
- Verify `package-lock.json` is being created
- Ensure sufficient database storage
- Check file size limits (500KB max per file)

### Google Drive Sync Issues

**Problem**: Folders created but files not uploaded.

**Solution**:
- Verify Google OAuth tokens are valid
- Check Drive API permissions
- Ensure `driveSyncMode` is set to `AUTO`
- Check backend logs for API errors

---

## Contributing

We welcome contributions! Please see our contributing guidelines.

---

**Documentation Version**: 1.0.0  
**Last Updated**: January 2026  
**Maintained by**: Team H42

