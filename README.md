# CV Tailor

Turkish-first resume tailoring with verified source claims, a fixed two-page
template, Gemini BYOK, and server-rendered PDF output. `PROJECT_SPEC.md` is the
implementation contract. See `IMPLEMENTATION_STATUS.md` for actual phase progress;
the repository is not yet a completed MVP.

## Development

Use Node **24.13.0** and pnpm **12.5.1** via Corepack. Do not use another package manager.

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

If system-wide Corepack shims are unavailable, `corepack pnpm` works directly.
For this workspace a local shim is also available in `.cache/bin`.
Open http://localhost:3000. Inter fonts are bundled locally; build does not fetch
Google Fonts. Runtime production configuration is validated at startup.

## Local Supabase

Start Docker Desktop, then run `corepack pnpm db:start`. Copy `.env.example` to
`.env.local` and fill the local keys from Supabase's status output. Never paste
keys into tracked files or logs. Production needs separate Supabase/Vercel
environments, verified email delivery, and real server secrets.

The reference CV belongs at `references/source-cv.pdf`. Private reference files
and extraction artifacts are ignored by Git and are never public application assets.

## Verification

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```

Browser tests include desktop/mobile geometry, keyboard navigation and axe
accessibility checks. Tests never call a live AI provider by default.
Local security sandboxes must permit test/browser child processes.

## Runtime dependencies

| Packages | Purpose |
| --- | --- |
| next, react, react-dom | App Router, server rendering, interactive components |
| radix-ui, shadcn, class-variance-authority, cn, tw-animate-css | Official shadcn component primitives, CSS, variants, class merging |
| lucide-react | Application icons |
| @fontsource-variable/inter | Self-hosted application font |
| sonner | Accessible transient notifications |
| zod | Runtime boundary validation |
| server-only | Prevent sensitive modules entering client imports |

## Delivery gates

Phases are implemented sequentially. The canonical template needs human visual
approval against the original CV before AI integration. A passing local build
does not imply production readiness, RLS correctness, or accepted PDF fidelity.
The final release requires every gate in specification Sections 31, 34 and 38.
