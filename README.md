# Vite + React + Mantine Application

A minimal, modern web application built with Vite, React, TypeScript, and Mantine UI.

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React 18** - UI library
- **TypeScript** - Type safety
- **Mantine** - Component library

## Development

```bash
# Install dependencies
npm install

# Start development server (with API proxy)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development API Proxy

In development, Vite proxies `/api/*` requests to your backend. Configure the target URL:

1. Copy `.env.example` to `.env`
2. Set `VITE_API_URL` to your backend URL (default: `http://localhost:8080`)

## Production

### Building

```bash
npm run build
```

This creates optimized static files in the `dist/` directory.

### Serving with Caddy

The included `Caddyfile` serves the static files and unifies three separate APIs under a single `/api` endpoint:

- `/api/service1/*` → Service 1 backend
- `/api/service2/*` → Service 2 backend
- `/api/service3/*` → Service 3 backend

Configure backend URLs via environment variables:

```bash
export API_SERVICE1_URL=http://service1:8081
export API_SERVICE2_URL=http://service2:8082
export API_SERVICE3_URL=http://service3:8083
```

Run Caddy:

```bash
caddy run
```

## API Usage

The `src/api.ts` file provides a typed API client:

```typescript
import { api } from "./api";

// Service 1
const data = await api.service1.get("/endpoint");
await api.service1.post("/endpoint", { key: "value" });

// Service 2
const data = await api.service2.get("/endpoint");

// Service 3
const data = await api.service3.get("/endpoint");
```

## Project Structure

```
├── Caddyfile          # Production server configuration
├── src/
│   ├── api.ts         # API client utilities
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── .env.example       # Environment variables template
└── vite.config.ts     # Vite configuration with dev proxy
```
