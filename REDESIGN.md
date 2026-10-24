<!-- REDESIGN.md  (repo root) -->
# Spurs Admin redesign: guide

Read `AGENT.md` first. It has the stack, the permission rules and the answer format. This file says **what we are building and in what order**. If the two ever disagree, `AGENT.md` wins.

## Goal
Replace "a separate room per service" with **one console that operates the whole platform**. An operator should be able to answer three questions without knowing which service owns the data:
1. What needs me right now?
2. What's going on with this person, payment or merchant?
3. How do I change how the platform behaves?

## Principles
1. **Organize by job, not by service.** Navigation says "Review queues" and "People", not "Survey" and "Accounts".
2. **Queues before dashboards.** A page that needs a decision shows the decision first (what, who, how risky, approve/decline), and charts second.
3. **Reuse, don't rebuild.** Every service page and action exists today. Redesign the shell and the page layout; leave server actions and SDK calls alone unless the task says otherwise.
4. **One page at a time.** Change a page's look or its behaviour in a single pass, never both.
5. **Fail visibly.** A service that is down shows "couldn't reach X" in the UI, never a blank card or a crash.
6. **Money and standing are guarded.** Anything that moves money, XP, standing or rates keeps its permission gate, audit entry and confirmation dialog, however the page changes.

## Target shape
```
Console (one sidebar, collapsible sections)
├─ Today            Inbox, Overview
├─ People           Customers, KYC, Fraud, Security
├─ Money            Payments, Transactions, Merchants, Payouts, Wallets, Subscriptions
├─ Review queues    Cash-outs, Task submissions, Gift card trades, Salary advances
├─ Products         Earn, Gift cards, Arena, AI Trader, Suite & Cloud
├─ Team             People, Teams, Console roles, Payroll
└─ Settings         Service settings, Platform (mail, AI, credentials, scheduler, audit)
```
On top of that sit three cross-cutting features:
- **Inbox** (`/inbox`): live counts of everything waiting on a human, with deep links.
- **Customer 360**: one page per person across accounts, wallet, pay, earn, gift cards and arena, with staff notes.
- **Command palette (⌘K)**: search any user, payment reference or merchant, and jump to any page.

## Page anatomy (every redesigned page follows this)
1. **Header**: title, one-line description, primary action on the right.
2. **Attention strip** (only when something is wrong): amber/red banner in the existing style (`rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm`).
3. **Summary tiles**: at most 4, using the standard stat tile.
4. **Main content**: queue, `DataTable`, or form.
5. **Footnote** (optional): one muted line explaining how the page works, as on `/mail` and `/scheduler`.

Required states for every data section: **loading** (use `loading.tsx` or skeleton), **empty** (icon, one line of title, one line of help), **error / service unreachable** (message plus what to check). Mobile: tables scroll inside `overflow-x-auto`; actions stay reachable.

## Phases and status
Mark items as they land.

**Phase 0: shell** (done when the sidebar is merged)
- [ ] `lib/workspaces.ts` single workspace with collapsible sections
- [ ] Replace `SidebarBody`, `ContextSidebar`, `ShellFrame`, `MobileNav`, `WorkspaceHeader`
- [ ] Delete `components/shell/AppRail.tsx`
- [ ] Grep and delete the unused `*Tabs.tsx` files (Accounts, Pay, Wallet, Survey, Suite, Giftcard, Arena, AiTrader). Keep `SubscriptionsTabs`, which is used.

**Phase 1: Inbox**
- [ ] `lib/inbox.ts` + `app/(console)/inbox/page.tsx`
- [ ] Make `/inbox` the post-login landing page (change the redirect in `app/login/actions.ts`)
- [ ] Add a sidebar badge with the total count (server-provided, passed into `SidebarBody`)

**Phase 2: permissions pass** (no visual change)
- [ ] Replace `requireAdmin()` with the correct permission in Accounts, Survey, Gift cards, Arena, Pay and Wallet pages and actions
- [ ] Gate `/audit` with `console.audit.read`
- [ ] Add missing audit entries for any mutation without `logAction`

**Phase 3: Customer 360**
- [ ] Merge `app/(console)/users/[id]` and `services/accounts/users/[id]` into one page
- [ ] DB: add `customerNotes` to `lib/db/schema.ts`, then `npx drizzle-kit push`
- [ ] Notes UI (add, pin) with audit entries
- [ ] Suspend / reinstate for customers (`customers.suspend`)

**Phase 4: ⌘K palette**
- [ ] `components/shell/CommandPalette.tsx` (client) + a server action that searches users, payments and merchants
- [ ] Mount it in `Topbar`; search by email, name, user id, payment reference

**Phase 5: page-by-page restyle** (one per pass, in this order)
Queues first: cash-outs, task submissions, gift card trades, KYC, advances. Then money pages. Then product pages. Settings last.

**Phase 6: settings unification**
- [ ] One generic `SettingsForm` replacing `PaySettingsForm`, `WalletSettingsForm`, `SuiteSettingsForm` and accounts `SettingsForm` (they differ mainly in the catalogue type and the save action)

## Rules for restyling a single page
Before touching it, list: (a) what data it reads, (b) every action it can take, (c) the permission each one needs. After the change, all three must be identical unless the task says otherwise. Then:
1. Apply the page anatomy above.
2. Replace ad-hoc `<table>` markup with `DataTable` only when the table has more than ~25 rows or needs search/filter. Keep simple lists as they are.
3. Keep `export const dynamic = "force-dynamic"`.
4. Keep money in integer kobo and keep each page's formatter.
5. Keep every mutation's `logAction`.
6. Don't add libraries. Don't change colours beyond semantic tokens.
7. Update `lib/workspaces.ts` if the page moves or is renamed.

## Definition of done (every task)
- [ ] `npm run lint` and `npm run build` pass
- [ ] The page works with the service unreachable (shows the unreachable state, no crash)
- [ ] The permission gate matches `lib/permissions.ts` (no invented keys)
- [ ] Mutations are audited and revalidated
- [ ] Works at phone width
- [ ] Both light and dark themes look right
- [ ] If payroll was touched: `npx tsx lib/payroll/engine.verify.mts` passes
- [ ] The status checklist above is updated

## Open questions (don't guess: ask the owner)
1. **Linking identities for Customer 360.** Accounts uses integer user ids (`AccountUser.id: number`); the platform DB uses text ids (`spurs.users.id`). What links them: the email, or a shared `sub`? Decide before Phase 3.
2. Should staff notes be visible to every console user or gated behind `customers.read`?
3. Should the Inbox be the landing page for all roles, or only roles with at least one queue permission?
4. Do the "Open X app" links need production URLs? They are hard-coded to `127.0.0.1` ports today.

## Prompt template (paste into the agent for each task)
```
Read AGENT.md and REDESIGN.md.
Task: Phase <n>, <item>.
Files in scope: <paths>.
Do NOT change: server actions, SDK calls, permission keys (unless the task says so).
Give full code for every changed file, with the path comment on line 1,
a paste order, and a manual test checklist.
```