# Brave AI

Brave AI is an independent TanStack Start web app with streaming chat, saved conversations, model selection, voice input, and an App Builder workflow. It does not require the app builder to build, run, or deploy.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm start
```

## Environment

Copy `.env.example` to `.env` and fill in your own values. Server-side secrets must stay in the host's environment settings.

- `SUPABASE_URL` / `VITE_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `AI_BASE_URL` (for example, an OpenAI-compatible provider endpoint)
- `AI_API_KEY`
- `TRANSCRIBE_MODEL` (optional; defaults to `whisper-1`)

## Deployment

The app can be deployed to any host that supports Node.js/TanStack Start and environment variables. A hosted app-builder account is not required.
