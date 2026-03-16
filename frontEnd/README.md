# EOS Frontend

Next.js frontend for **Exim Operation System (EOS)** — Phase 1 Import. Uses `frontend/design-tokens.json` as the design source of truth; no new colors or tokens are invented.

## Frontend structure

```
frontend/
├── app/                    # Next.js App Router — keep page files thin
│   ├── layout.tsx         # Root layout: theme injection, AuthProvider, global styles
│   ├── page.tsx           # Home (public)
│   ├── login/             # Login page
│   └── dashboard/         # Protected area: layout + dashboard page
├── components/
│   ├── layout/            # AppLayout, MainLayout, Header (reusable layout structure)
│   └── providers/         # AuthProvider
├── hooks/                  # useAuth (auth state)
├── services/               # API client abstraction, auth-service
├── lib/                    # tokens, config, cookies, constants (paths), format-date
├── types/                  # api, auth (shared types)
├── styles/                 # globals.css (uses CSS variables from tokens)
├── middleware.ts           # Route protection: redirect unauthenticated to /login
├── design-tokens.json      # Design source of truth — do not invent new tokens
└── README.md
```

## Design token usage

- **Source of truth:** `frontend/design-tokens.json`. All colors, typography, spacing, borderRadius, elevation, and animation values come from this file.
- **Do not** add new colors or tokens elsewhere; extend the JSON if new tokens are needed.
- **In code:** Use `lib/tokens.ts` to resolve tokens and inject CSS variables. The root layout calls `getThemeCssVars()` and injects a `<style>` block so `:root` has variables like `--color-primitive-text-charcoal`, `--typography-fontSize-base`, etc.
- **In CSS:** Use the variables only. Example:
  ```css
  .title {
    font-family: var(--typography-fontFamily-heading);
    font-size: var(--typography-fontSize-h2);
    color: var(--color-primitive-text-charcoal);
  }
  ```
- **Reference format:** Token paths in the JSON use dots (e.g. `color.primitive.brand.red.primary`). They are exposed as CSS vars with dots replaced by hyphens: `--color-primitive-brand-red-primary`.
- **Semantic tokens** (e.g. `color.semantic.primary.default`) reference primitives in the JSON; the resolver resolves them to the final hex/value.

## API client abstraction

- **Location:** `services/api-client.ts`
- **Usage:** `apiGet(path, accessToken)`, `apiPost(path, body, accessToken)`, etc. All requests go to `NEXT_PUBLIC_API_URL`; the caller supplies the access token (e.g. from `useAuth().accessToken`).
- **Token strategy:** Access token is kept in memory and in a cookie (`eos_access`) so middleware can protect routes. Refresh token is stored in a cookie (`eos_refresh`) for session restore. On 401, the app should call refresh (via auth service) and retry; auth state is handled in `useAuth`.

## Auth state and route protection

- **Auth state:** `hooks/use-auth.tsx` provides `AuthProvider` and `useAuth()` with `user`, `accessToken`, `loading`, `login`, `logout`, `refreshSession`. Tokens are persisted in cookies so that after login, middleware can see the access token.
- **Route protection:** `middleware.ts` protects paths under `/dashboard`. If the `eos_access` cookie is missing, the user is redirected to `/login?from=/dashboard` (or the path they tried to open).
- **Token usage:** On login, tokens are stored in state and in cookies. API calls pass `accessToken` into the API client. On logout, cookies are cleared and state is reset.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:3003/api/v1`). Used by the API client. |

See `.env.example` in this directory. For local dev, create `.env.local` and set `NEXT_PUBLIC_API_URL`.

## Run instructions

### Local (no Docker)

1. From the **frontend** directory:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and set NEXT_PUBLIC_API_URL (e.g. http://localhost:3003/api/v1)
   npm install
   npm run dev
   ```
2. Open http://localhost:3000 (or the port Next.js shows).

### With Docker Compose (from project root)

```bash
docker compose up --build
```

Frontend is served on the host port set by `FRONTEND_PORT` (default 3002): http://localhost:3002.

### Build and start (production)

```bash
npm run build
npm run start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |

## Cursor rules alignment

- Pages are thin: they delegate to components and hooks.
- API calls live in the service layer (`services/`).
- Shared types are in `types/`.
- Styling uses design tokens only; no ad-hoc colors or spacing.
- Route protection is centralized in `middleware.ts`.
