# CaseMind AI

## Deployment

The frontend now talks to `"/api"` in production, and the `/api/ask` route is handled directly in Vercel so the chatbot no longer depends on a separate backend proxy.

Set these environment variables in Vercel:

```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
CASEMIND_ADMIN_EMAIL=admin@casemind.ai
CASEMIND_ADMIN_PASSWORD=admin123
```

If you also host the FastAPI backend separately, keep these local or server-side values in sync:

```bash
BACKEND_URL=http://127.0.0.1:8000
VITE_API_BASE_URL=http://127.0.0.1:8000
```

If the AI key is missing, the app still returns a structured legal fallback instead of a blank or generic response.
