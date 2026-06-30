# CaseMind AI

## Deployment

The frontend now talks to `"/api"` in production, so on Vercel it will use the same deployment origin automatically.

If you also have a separate backend service, set this environment variable in Vercel:

```bash
VITE_API_BASE_URL=https://your-backend-domain.example
```

Backend environment variables:

```bash
GROQ_API_KEY=your_groq_api_key_here
CASEMIND_ADMIN_EMAIL=admin@casemind.ai
CASEMIND_ADMIN_PASSWORD=admin123
```

If the backend proxy is unavailable, the app falls back to a browser-side local mode so the UI still works for login, signup, profile updates, history, and chat guidance on the current device.
