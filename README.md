# BlendByte

AI-powered gift recommendation platform that helps users find the perfect gift through conversational intake and intelligent product matching.

## Project Structure

```
BlendByte/
├── frontend/     # Next.js application (Vercel)
├── backend/      # FastAPI application (Render)
└── README.md
```

## Tech Stack

### Frontend
- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- Clerk (Google OAuth)
- React

### Backend
- Python 3.11+
- FastAPI
- Clerk SDK (JWT verification)
- Supabase (PostgreSQL)
- Upstash Redis
- OpenAI API

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy `.env.example` to `.env` and fill in your credentials

5. Run database migrations in Supabase dashboard (see `migrations/001_initial_schema.sql`)

6. Start the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your credentials

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` files in `frontend/` and `backend/` directories for required environment variables.

## Phase 1 - Current Status

✅ Auth system with Clerk (Google OAuth)
✅ User management in Supabase
✅ Protected routes with middleware
✅ FastAPI backend with JWT verification
✅ Landing page with login/logout flows

## Development

- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:8000`
- API docs available at `http://localhost:8000/docs`

## Deployment

- Frontend: Vercel (auto-deploy from main branch)
- Backend: Render (Docker container)

## License

Proprietary
