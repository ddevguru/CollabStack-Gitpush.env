# CollabStack IDE - Real-Time Collaborative Development Platform

<div align="center">

![CollabStack IDE](https://img.shields.io/badge/CollabStack-IDE-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

**A magical real-time collaborative IDE with distributed execution, AI assistance, and seamless integrations**

[Features](#features) • [Team](#team) • [Installation](#installation) • [Documentation](./DOCUMENTATION.md)

</div>

---

## 🚀 Overview

CollabStack IDE is a next-generation collaborative development platform that enables teams to code together in real-time, execute code on distributed compute resources, and leverage AI assistance—all in one unified workspace. Built for modern software development teams who need seamless collaboration without infrastructure headaches.

## ✨ Key Features

### 🎯 Real-Time Collaboration
- **Live Code Editing**: Multiple users can edit the same file simultaneously with live cursor tracking
- **Voice & Video**: Built-in voice calls and voice notes for instant communication
- **User Presence**: See who's working on what file in real-time
- **Design Collaboration**: Figma-like design canvas with real-time multi-user editing

### ⚡ Distributed Execution
- **Multi-Region Execution**: Run code on GPU clusters across different regions
- **Real-Time Output Streaming**: See execution results stream live as they happen
- **Compute Dashboard**: Monitor GPU usage, memory, CPU, and cluster information
- **Instant Execution**: Pre-warmed compute resources for zero-latency execution

### 🤖 AI-Powered Assistance
- **AI Chat**: Context-aware coding assistant powered by OpenAI GPT
- **Voice Commands**: Speak commands and get instant AI responses
- **Code Suggestions**: Intelligent code completion and suggestions

### 🔗 Seamless Integrations
- **GitHub Integration**: Auto-push to GitHub repositories
- **Google Drive Sync**: Automatic file synchronization to Google Drive
- **Google Calendar & Meet**: Schedule meetings and mark important dates
- **WhatsApp Sharing**: Share code snippets as compressed ZIP files

### 💻 Advanced Features
- **Multi-Language Support**: Execute code in 17+ languages (JavaScript, Python, Java, C++, Go, Rust, etc.)
- **Terminal Tabs**: Multiple terminal sessions for parallel command execution
- **Package Management**: Run npm, pip, mvn, cargo commands directly
- **Code Execution**: Judge0 API integration for secure code execution
- **Email Verification**: OTP-based email verification and password reset

## 👥 Team

**Team Name:** H42

**Team Members:**
- Deepak Mishra
- Utkarsh Sharma
- Alok Tiwari

## 🛠️ Tech Stack

### Frontend
- **React** + **TypeScript** - Modern UI framework
- **Monaco Editor** - VS Code-like code editor
- **Socket.IO** - Real-time communication
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **JSZip** - File compression

### Backend
- **Node.js** + **Express** - Server framework
- **Socket.IO** - WebSocket server
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Judge0 API** - Code execution
- **OpenAI API** - AI assistance
- **Google APIs** - Drive, Calendar, Meet integration

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd collaborative-ide
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Configure environment variables**

Create `.env` files in both `backend` and `frontend` directories:

**Backend `.env`:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/collabstack"
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/google/callback"
OPENAI_API_KEY="your-openai-api-key"
JUDGE0_RAPIDAPI_KEY="your-judge0-rapidapi-key"
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

4. **Setup database**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. **Run the application**
```bash
# From root directory
npm run dev

# Or run separately
npm run dev:backend  # Runs on http://localhost:3000
npm run dev:frontend # Runs on http://localhost:5173
```

## 📚 Documentation

For detailed documentation including:
- Complete database schema
- API endpoints
- Architecture overview
- Usage examples
- Platform differentiators

See [DOCUMENTATION.md](./DOCUMENTATION.md)

## 🎯 Why CollabStack IDE is Different

1. **Real-Time Everything**: Not just code editing—real-time execution, real-time output, real-time collaboration
2. **Distributed Compute**: Execute code on remote GPU clusters without managing infrastructure
3. **Zero Setup**: No need to configure environments—everything runs in the cloud
4. **AI-First**: Built-in AI assistant that understands your project context
5. **Unified Workspace**: Code, design, chat, execute—all in one place
6. **Seamless Integrations**: GitHub, Google Drive, Calendar—all connected automatically

## 🔐 Security

- OTP-based email verification
- JWT authentication
- Secure password hashing
- OAuth2 for third-party integrations
- Encrypted file storage

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ by Team H42**
