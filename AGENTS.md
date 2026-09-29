# Brave AI contributor notes

This project is independent and is not connected to a hosted app builder.

- Keep the production build working with `npm run build`.
- Never commit `.env` or server-side API keys.
- AI traffic is sent to the OpenAI-compatible endpoint configured by `AI_BASE_URL` and `AI_API_KEY`.
- Supabase is used only for authentication, subscriptions, saved chats, and usage data.
