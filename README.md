# Skill2Hire

End-to-end web app for AI-powered placement readiness.

## Tech

- Frontend: React (Vite)
- Backend: Node.js + Express
- Storage: SQLite (via sql.js, persisted to a local file)

## Prerequisites

- Node.js 18+

## Setup

From the project root:

```bash
npm install
```

## Run (dev)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Environment

Backend reads:

- `OPENAI_API_KEY` (optional) to enhance suggestions.

If not provided, the app uses built-in heuristics and still works end-to-end.
