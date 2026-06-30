# CaseMind AI

## Deployment

If you want the frontend to work on Vercel and talk to a separate backend, set these environment variables:

```bash
BACKEND_URL=https://your-backend-domain.example
```

`VITE_API_BASE_URL` is optional. If you do not set it, the frontend uses `/api` in production and `http://127.0.0.1:8000` during local development.

Backend environment variables:

```bash
GROQ_API_KEY=your_groq_api_key_here
CASEMIND_ADMIN_EMAIL=admin@casemind.ai
CASEMIND_ADMIN_PASSWORD=admin123
```

The frontend calls `/api/*` in production. Vercel proxies that to `BACKEND_URL` through `api/[...path].js`.

If you are developing locally, the app defaults to `http://127.0.0.1:8000` unless you set `VITE_API_BASE_URL` yourself.
