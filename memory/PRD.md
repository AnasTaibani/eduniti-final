# EduNiti - AI Tutor for Personalized NCERT Learning

## Original Problem Statement
Build EduNiti, an AI-powered intelligent tutoring system for NCERT curriculum with personalized, adaptive learning using LLMs (GPT-4o-mini), RAG with BM25 retrieval, Bayesian Knowledge Tracing, gamification, guest access, multilingual support, teacher dashboard, chat sessions, and profile/settings management.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Recharts + KaTeX (port 3000)
- **Backend**: FastAPI + Python (port 8001)
- **Database**: MongoDB (motor async driver)
- **AI**: OpenAI GPT-4o-mini (direct API)
- **Retrieval**: BM25 over 27,685 NCERT passages (JSONL)
- **Adaptive Learning**: BKT with response time + behavior factors

## What's Been Implemented

### Phase 1 (MVP) - Complete
- Student registration/login with JWT
- RAG-based AI chat tutor with conversation history (10 messages)
- Follow-up questions with contextual phrases
- 3 action buttons: Simplify, Elaborate, Ask Quiz
- Grade-specific subject filtering
- Adaptive quiz generation
- BKT mastery tracking
- Progress dashboard with charts

### Phase 2 (Enhancements) - Complete
- Hindi/English language toggle in chat
- Guest access (5 free chats, unlimited quiz) without registration
- Daily login streaks + 8 visual badges (gamification)
- Ask Quiz: generates 5 questions from chat context, auto-redirects to Quiz Center
- Chat session management (clear history)
- Enhanced Progress Dashboard with AI study recommendations
- Strong/weak topic analysis with practice suggestions
- Production-ready UI (no static images, clean design)
- Plain readable math notation (no raw LaTeX)
- Response time tracking for mastery calculation

### Phase 3 (Teacher & Sessions) - Complete (April 11, 2026)
- ChatGPT-style sidebar with session management (create, load, delete sessions)
- Auto-generated session titles from first message
- Settings page: language (8 languages), difficulty level, daily study goal, quiz question count
- Profile page: view/edit name, badges display, stats (quizzes, mastery, streak, level)
- Teacher portal: separate login/register with access code (EDUNITI-TEACHER-2026)
- Teacher dashboard: class overview, student list, individual student detail view
- Teacher quiz assignment: assign quizzes to students based on weak topics
- Student can see assigned quizzes in Quiz Center
- Class analytics: aggregated weak/strong topics across all students
- KaTeX math rendering in chat messages (inline and block math)
- Navigation: Profile/Settings in dashboard nav, Teacher Portal link on landing page

## Key Routes
- `/` - Landing page (student auth + guest access)
- `/dashboard` - Student dashboard
- `/chat` - AI Tutor with sidebar sessions
- `/quiz` - Quiz Center (self-generated + teacher-assigned)
- `/progress` - Learning progress with charts
- `/settings` - Study preferences
- `/profile` - Profile with badges and stats
- `/teacher` - Teacher login/register portal
- `/teacher/dashboard` - Teacher dashboard
- `/guest/chat` - Guest chat (5 free)
- `/guest/quiz` - Guest quiz (unlimited)

## API Endpoints
### Public
- POST /api/auth/register, POST /api/auth/login
- POST /api/auth/teacher/register, POST /api/auth/teacher/login
- POST /api/guest/chat, POST /api/guest/quiz/generate
- GET /api/subjects/{grade}

### Protected (Student)
- GET /api/auth/me
- POST /api/chat, POST /api/chat/action
- GET/POST/DELETE /api/chat/sessions, GET /api/chat/sessions/{id}/messages
- POST /api/quiz/generate, POST /api/quiz/submit, GET /api/quiz/assigned
- GET /api/progress/analytics, GET /api/progress/mastery, GET /api/progress/recommendations
- GET /api/progress/streak, GET /api/progress/badges
- GET/PUT /api/profile, GET/PUT /api/settings

### Protected (Teacher)
- GET /api/teacher/students, GET /api/teacher/student/{id}
- POST /api/teacher/assign-quiz, GET /api/teacher/class-analytics

## Prioritized Backlog
### P1 (Important)
- More regional languages (Marathi, Tamil, etc.) - UI exists for 8 languages
- PDF export of progress reports

### P2 (Nice to Have)
- MuRIL/FAISS embeddings for semantic search
- Cross-encoder reranking
- Gamification: XP system, leaderboard
- Mobile-responsive optimizations
- Push notifications for streak reminders
- Production-grade frontend polish
