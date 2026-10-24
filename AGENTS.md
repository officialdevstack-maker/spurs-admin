<!-- AGENT.md  (repo root) -->
# Spurs Admin: agent guide

The control plane for Spurs Cloud (Pay, Wallet, Accounts, Earn/Survey, Gift cards, Arena, AI Trader, Suite, Cloud). Staff sign in here to review queues, look up customers and money, run payroll, and configure every other Spurs app.

## How to answer (read first)
- Always give complete code, never "rest unchanged" snippets.
- The first line of every code block is a comment with the exact file path (`// app/(console)/...`). Mark new files `// NEW FILE: ...`.
- Keep consistency with existing code. Copy the nearest similar file before inventing a pattern.
- Do not add dependencies, new CSS files or new design tokens.
- Ask before changing the DB schema or any permission key.
- Never print, log or hard-code secrets.

## Stack
Next.js 16 (App Router, `proxy.ts` instead of middleware), React 19, TypeScript strict, Tailwind v4, shadcn/ui (new-york) over `radix-ui`, lucide-react, TanStack Table, Drizzle ORM (neon-http), `jose` (JWT), zod v4, nodemailer. Alias `@/*` maps to the repo root.

## Commands
- `npm run dev`: dev server on :3300
- `npm run build` / `npm start`
- `npm run lint`
- `npm run scheduler`: tick worker (`scripts/scheduler.mjs`), pokes `/api/private/scheduler/tick` every minute
- `npx drizzle-kit push`: apply `lib/db/schema.ts` (schema `admin` only)
- `node scripts/push.mjs`: legacy raw-SQL bootstrap
- `npx tsx lib/payroll/engine.verify.mts`: run after ANY change to tax bands or payroll rates

Deploy: push to `master` runs `.github/workflows/deploy.yml` (Node 20, `output: "standalone"`, FTPS to cPanel, Passenger restart via `tmp/restart.txt`).

## Two databases, two rules
1. **Admin DB** (`ADMIN_DATABASE_URL`, schema `admin`): admins, roles, credentials, plans, subscriptions, audit log, teams, payroll, mail log, AI usage, scheduler. Accessed with Drizzle via `import { db, <table> } from "@/lib/db"`.
2. **Shared platform DB** (`DATA_DATABASE_URL`, falls back to the admin URL): schemas `spurs`, `pay`, `wallet`, `survey`, `giftcards`, `suite`. **Read-only, raw SQL** through `neon()` in `lib/data.ts`, `lib/pay-data.ts`, `lib/wallet-data.ts`, `lib/suite-data.ts`, `lib/sdk/survey.ts`, `lib/sdk/giftcards.ts`.

**Never write to the shared DB from here.** Anything that moves money, XP, standing or rates goes through that app's internal API (`x-internal-secret: INTERNAL_API_SECRET`) so business rules live in one place. Accounts is reached only through `lib/sdk/accounts.ts`.

## Auth and permissions
- Own session (`admin_session`, HS256 JWT, 12h). Not the Spurs SSO.
- Console roles are data (`admin_roles`). The permission catalogue is code: `lib/permissions.ts`. `superadmin` is the wildcard `"*"`.
- Pages: `requirePermission("key")`. Server actions that return results: `assertPermission("key")`. Superadmin-only: `requireSuperadmin()`. UI hiding: `can("key")` passed down as props. **Hiding a button is never the enforcement; every action re-checks.**
- Never invent a permission key. A new one means: add to `PERMISSION_CATALOGUE`, grant it deliberately to roles, and use it somewhere.
- Customer roles (Accounts API) and console roles (here) are separate. Never mix them.

## Conventions
**Pages**: server components, `export const dynamic = "force-dynamic";`, parallel fetch with `Promise.all`, gate first.
**Server actions** (`actions.ts`, `"use server"`):
1. gate with permission
2. do the work
3. `logAction(admin, "area.thing.verb", target, meta?)` from `@/lib/audit`
4. `revalidatePath(...)`
5. return `{ ok: true as const, ... }` or `{ ok: false as const, error: e instanceof Error ? e.message : "<fallback>" }`

Form-post actions take `FormData` and return void. Client-driven actions use `useTransition` and return the result shape above. Audit targets use `type:id` (`user:123`, `kyc:5`).
**Money**: integer kobo end to end, never floats. Format with the local `naira()` helpers. Wallet assets use `ASSET_DECIMALS` in `lib/wallet-data.ts`. Dates: `toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })`.
**Server-only**: `lib/**` modules that touch secrets start with `import "server-only";`. Client components cannot import them (which is why some settings forms duplicate option lists locally).
**Config and secrets**: stored AES-256-GCM in `admin.credentials`. Read with `resolveConfig(appId)`; write with `upsertCredential`. Blank secret input means "keep current". Secrets never round-trip to the browser. Other apps read config from `GET /api/config?app=` (`x-admin-bootstrap`).

## UI patterns
- Components from `@/components/ui/*`. Use `cn` from `@/lib/utils`.
- Stat tile: `Card` > `CardHeader flex-row` (muted label + `bg-primary/10 text-primary` icon chip) > `CardContent` (`text-2xl font-bold tracking-tight`).
- Large tables: `DataTable` + `SortableHeader` (`components/data-table/data-table.tsx`), faceted `filters`, CSV via `downloadCsv`. Server lists: `components/Pagination`. In-memory client lists: `usePaged` + `ClientPagination`.
- Charts: `components/charts/{LineChart,BarChart,DonutChart,VolumeBarChart}`.
- Client mutations: `useTransition`, `Loader2` on the button, success `text-emerald-600 dark:text-emerald-400`, error `text-destructive`. Destructive confirmations use `Dialog`.
- Status colours are emerald / amber / red only. Everything else uses semantic tokens (`text-muted-foreground`, `bg-primary`, `border`).
- Settings screens follow the catalogue pattern (`lib/*-settings.ts` + `*SettingsForm.tsx` + `actions.ts`). Copy `pay-settings`.

## Navigation
One console, one sidebar. `lib/workspaces.ts` defines a single workspace with collapsible sections. Adding a page means adding a `NavItem` there; the active item is the longest matching `href`. Use `perm` on an item only to hide it (see Auth). Page titles on `/services/*` come from `WorkspaceHeader`.

## Recipes
**New page**: create `app/(console)/<area>/page.tsx`, gate it, add a `NavItem`, add `logAction` to any mutation.
**New scheduler job**: add to `JOBS` in `lib/scheduler/jobs.ts`. It must be idempotent (at-least-once delivery). The schedule itself is editable in the console.
**New email**: add a `Template` to `lib/mail/templates.ts` (HTML and text). Send with `sendMail({ app, template, to, context, idempotencyKey })`. Mail failures must never throw into the caller.
**New internal endpoint**: put it under `app/api/private/**` and check `x-internal-secret`. `proxy.ts` leaves `/api/private/*`, `/api/config`, `/api/plans`, `/api/subscriptions`, `/login`, `/auth/*`, `/invite/*` public by design.
**New AI/mail/pay provider**: implement the provider interface in its `providers.ts` and register it in the list.

## Environment variables
`ADMIN_DATABASE_URL`, `DATA_DATABASE_URL`, `ADMIN_SESSION_SECRET`, `ADMIN_ENCRYPTION_KEY`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_BOOTSTRAP_SECRET`, `INTERNAL_API_SECRET`, `ADMIN_PUBLIC_URL`, `ADMIN_COOKIE_DOMAIN`, `APP_URL`, `ACCOUNTS_ADMIN_URL`, `SURVEY_INTERNAL_URL`, `GIFTCARDS_INTERNAL_URL`, `PAY_INTERNAL_URL`, `PAY_PUBLIC_URL`, `SURVEY_PUBLIC_URL`, `ESPORT_INTERNAL_URL`, `TRADER_SERVICE_URL`, `AITRADER_ADMIN_SECRET`, `SCHEDULER_INTERVAL_MS`. `.env` is git-ignored. Never commit it.

## Known gaps (fix deliberately, not silently)
- Many service actions still use `requireAdmin()` instead of the matching permission (`customers.*`, `money.*`, `ops.*`). Accounts actions are the main ones.
- `/audit` and several pages have no permission gate beyond sign-in.
- Payroll tax bands are best-effort defaults; confirm with an accountant before a real run.

## Don't
- Don't write to the shared DB or bypass an app's internal API.
- Don't use floats for money.
- Don't return raw secrets to a client component.
- Don't delete `_t.mts`, `_shim.cjs`, `_noop.cjs` (the scheduler test harness).
- Don't rewrite a page's behaviour while restyling it; change one at a time.

<!-- AGENT.md: add under the "How to answer" section -->
- For any redesign or revamp task, also read `REDESIGN.md` and follow its phase order and page anatomy.