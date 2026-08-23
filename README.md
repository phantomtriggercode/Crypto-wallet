# Your Wallet — Educational Crypto Wallet Platform

A complete, white-label **educational / sandbox** cryptocurrency wallet and digital-asset management platform.

> **This is a manual, simulated platform.** It never connects to a blockchain, never broadcasts a
> transaction, never holds real private keys, and never custodies real funds. Every balance lives in
> an internal, append-only ledger that administrators control by hand. See
> [Non-negotiable rules](#non-negotiable-rules) below.

## What's included

- **Manual-first ledger** — every balance change (deposit, withdrawal, swap, escrow, manual
  admin credit/debit, reversal) is an immutable `LedgerEntry`. Cached balances are always derived
  from — and reconcilable against — the ledger, never overwritten directly.
- **Full user wallet**: registration, email verification, TOTP 2FA + backup codes, password
  reset, session management, portfolio dashboard, deposit/withdraw/swap flows, transaction
  history, notifications, KYC submission, escrow deals with disputes, a support desk, and a
  simulated wallet-recovery-phrase flow whose plaintext is **never** readable by an administrator.
- **Full admin console** with granular role-based access control (`SUPER_ADMIN`,
  `FINANCE_ADMIN`, `KYC_ADMIN`, `SUPPORT_ADMIN`, `CONTENT_ADMIN`, `SECURITY_ADMIN`): manual
  balance credit/debit with a confirmation step and audit trail, deposit/withdrawal/KYC/escrow
  review queues, asset & network configuration, exchange-rate & trading-pair configuration,
  SMTP configuration + test email, email template editor, CMS for the homepage and branding,
  a media library, maintenance-mode switches, limits, and a full audit log.
- **White-label**: site name, logo, favicon, colors, homepage copy, and every email template are
  configured from the admin panel — nothing important is hard-coded.
- **Public site**: homepage, market/coin pages with price charts, crypto news, and static pages
  (About, Contact, FAQ, Terms, Privacy, Risk Disclosure).

## Tech stack

- **Next.js 16** (App Router, TypeScript, Route Handlers as the API layer)
- **MySQL** via **Prisma 6** — a straightforward, widely-supported combination that deploys
  cleanly on typical shared/VPS Node hosting (including Hostinger)
- **Tailwind CSS v4** for the UI
- Sessions: `jose`-signed JWT cookie + a database-backed `Session` table (revocable, listable)
- 2FA: `otplib` (TOTP) with hashed backup codes
- Email: `nodemailer` using admin-configured SMTP; falls back to structured console logging
  (including the link/content) when SMTP isn't configured yet, so the app is usable immediately
  after install
- KYC documents are stored **outside** `/public` and served through an authenticated,
  ownership-checked route handler — never a public URL

## Architecture notes (for extending this later)

- All financial mutations go through **one function**: `postLedgerEntry()` in `src/lib/ledger.ts`.
  It appends a `LedgerEntry` and updates the cached `Balance` row inside a single DB transaction
  with a row lock (`SELECT ... FOR UPDATE`), so it's safe under concurrent requests.
- Deposit/withdrawal/network models represent **display/reference data only** — `Network.depositAddress`
  is a string an admin types in, not a real wallet-derived address. If real blockchain
  functionality is ever added, the natural seam is a `providers/` layer that implements deposit
  detection and withdrawal broadcasting behind an interface, with `postLedgerEntry()` staying the
  single source of truth for balances either way.
- `src/lib/settings.ts` is a typed key-value store (`SystemSetting` table) for every
  admin-configurable toggle (maintenance mode, limits, timers, requirements, branding).

## Getting started locally

### 1. Prerequisites

- Node.js 20+
- A MySQL (or MariaDB) database

### 2. Install and configure

```bash
npm install
cp .env.example .env
# edit .env — see comments in the file for how to generate SESSION_SECRET and ENCRYPTION_KEY
```

### 3. Create the database schema and seed data

```bash
npx prisma migrate deploy   # applies the committed migrations
npm run db:seed             # seeds default assets/networks, email templates, and your admin account
```

The seed script prints your admin login once — save it immediately. Re-running the seed is safe;
it only creates what doesn't already exist.

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. Log in to `/admin` with the seeded admin account, or register a
normal account at `/register`.

## Deploying to Hostinger (or any Node + MySQL host)

These steps describe Hostinger's **hPanel → Websites → [your site] → Advanced → Node.js**
application feature, which runs your app under a managed Node process (Phusion Passenger) and
gives you a free temporary `*.hostingersite.com`/similar domain before you attach a real one.
Menu names can shift slightly between Hostinger plan tiers — if something doesn't match exactly,
look for "Node.js" and "Databases → MySQL Databases" in your hPanel sidebar.

1. **Push this repository to GitHub** (already done if you're reading this from your repo).
2. **Create a MySQL database** in hPanel → Databases → MySQL Databases. Note the database name,
   username, password, and host (usually `localhost` from the app's perspective).
3. **Create a Node.js application** in hPanel → Advanced → Node.js:
   - Node.js version: 20 or newer
   - Application root: the folder you deploy this repo into
   - Application startup file: not used directly by Next.js — set the **Run script** / startup
     command to `npm run start` (Hostinger's Node UI lets you specify an npm script or command)
   - Application URL: pick the temporary domain/subdomain Hostinger offers, or your own domain
4. **Set environment variables** in the Node.js app's environment variable panel — copy every key
   from `.env.example`, filling in the real `DATABASE_URL` from step 2, freshly generated
   `SESSION_SECRET`/`ENCRYPTION_KEY`, and `NEXT_PUBLIC_APP_URL` set to the domain from step 3.
5. **Deploy the code** (via Hostinger's Git integration, or upload/SSH) into the application root,
   then from the app's terminal/SSH session run:
   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   npm run build
   ```
6. **Start/restart** the Node.js application from hPanel. Next.js will serve on the port
   Hostinger assigns via the `PORT` environment variable automatically.
7. Visit your temporary domain, confirm `/` loads, then log in at `/admin` with the seeded admin
   account and finish configuring branding, SMTP, and assets from the admin panel.
8. When you're ready, attach your real domain in hPanel → Domains, and update
   `NEXT_PUBLIC_APP_URL` to match.

**If your Hostinger plan doesn't offer a Node.js application feature** (some shared plans only
support PHP), the same steps work unmodified on a Hostinger **VPS** plan, or on any other
Node+MySQL host (Railway, Render, DigitalOcean App Platform, a plain VPS with `pm2`, etc.) —
none of the code here is Hostinger-specific.

### Production checklist

- [ ] `SESSION_SECRET` and `ENCRYPTION_KEY` are freshly generated, not the local dev values
- [ ] SMTP is configured from **Admin → Communication → SMTP** and a test email succeeds
- [ ] The seeded admin password has been changed / rotated
- [ ] `PRIVATE_STORAGE_PATH` (if set) points somewhere with persistent disk and is **not** under `/public`
- [ ] `NEXT_PUBLIC_APP_URL` matches your real domain (used in emailed links)
- [ ] Branding, homepage copy, and asset/network addresses have been reviewed in the admin panel

## Non-negotiable rules

This platform is intentionally built so it **cannot** silently become a real financial system:

1. No blockchain RPC, broadcasting, or on-chain balance verification anywhere in the codebase.
2. All deposits are manually submitted by users and manually approved by an admin.
3. All withdrawals are manually reviewed and manually approved by an admin.
4. Every balance change is a permanent, auditable `LedgerEntry` — never a raw balance overwrite.
5. Simulated withdrawal references are labeled **"Internal Transaction Reference"**, never implied
   to be a real blockchain transaction hash.
6. Recovery-phrase plaintext is never persisted — only a bcrypt hash, unreadable by administrators.
7. KYC documents are stored privately and served only to the document owner or an authorized
   `KYC_ADMIN`/`SUPER_ADMIN`.

## Security testing

A normal user cannot call an `/api/admin/*` route (every one calls `requireAdmin()`), a
`CONTENT_ADMIN` cannot approve withdrawals or credit balances (routes that touch money require
`FINANCE_ADMIN` or `SUPER_ADMIN`), a `KYC_ADMIN` cannot modify balances, and a user can never write
to their own ledger — the only ledger-writing paths are the approval/manual-adjustment routes,
all of which are admin-gated.
