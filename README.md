# maniworld

## Lead-to-Booking Automation Pipeline (CRM)

This repository implements the "صفر تا صد" (zero-to-hundred) lead lifecycle
pipeline requested: from finding/validating a phone number, through account
creation and messaging, coordination with a potential applicant, all the way
to a confirmed hall/online/phone booking and a fully-planned presentation
session — including the previously-missing answer to *"who is speaking on
video?"*.

### Modules (`src/modules`)

| # | Module | File | Covers |
|---|--------|------|--------|
| 1 | Lead intake | `leadIntake.ts` | Unified form input, UTM capture, consent requirement, honeypot + time-trap anti-spam |
| 2 | Phone validation | `phoneValidation.ts` | E.164 normalization, format validation, OTP generation/verification, duplicate detection, best-number ranking (mobile + verified + recently active first) |
| 3 | Lead scoring | `leadScoring.ts` | Transparent, auditable scoring model (`ScoreBreakdown`) and a "potential applicant" threshold |
| 4 | Channel/account map | `channelMap.ts` | Default owner/goal/KPI/access-level entries for every platform named in the brief: Google, X, Telegram, WhatsApp, Instagram, LinkedIn, Facebook, YouTube, Meta Ads, Email, Forums, phone, in-person, website |
| 5 | Message & call scripts | `messageScripts.ts` | Versioned scripts per stage/channel, deterministic A/B variant selection, follow-up delay scheduling |
| 6 | Sales funnel automation | `funnelAutomation.ts` | Stage machine (`new-lead → … → booked`/`lost`), SLA rules per stage, automatic breach/escalation detection |
| 7 | Booking | `booking.ts` | Hall / online-meeting / phone-call / presentation slot booking with conflict prevention and auto-confirmation |
| 8 | Video/in-person session | `videoSession.ts` | **Explicitly assigns who speaks**: `primary-presenter`, `backup-presenter`, `quality-observer` roles; standard scenario (`opening → discovery → offer → next-step`); pre/during/post checklist including recording consent; a session is only "ready" once a presenter is named and consent + pre-checklist are complete |
| 9 | Interaction log | `interactionLog.ts` | Single append-only log unifying every online/offline touchpoint (message, call, meeting, in-person, paper form, email) |
| 10 | Reporting | `reporting.ts` | Response rate, meeting rate, booking rate, and cost-per-lead computation |
| 11 | Security & compliance | `security.ts` | Role-based access control (admin/sales/agent/viewer) and data-retention expiry checks |
| 12 | Locations | `locations.ts` | Per-market location registry: any number of salon branches (e.g. "Salon 1" @ address A, "Salon 2" @ address B, ...) and the company office (currently one office, 30 salespeople). Default working hours per market: 9am-9pm for business-buying/business-selling/investment, 10am-10pm for salon-women/home-service. |
| 13 | Market targets | `marketTargets.ts` | Daily confirmed-outcome targets per market (input panel + output for each: salon 90-110 bookings/day, home-service 90-110 bookings/day, business-buying 50-70 online sessions + 30-40 in-person meetings, business-selling 30 confirmed online contacts, investment 70 in-person meetings + 70+ online sessions) and a real-time/hourly pacing calculator that flags whether a market is behind, on-track, or over its max, and how much is still needed per remaining working hour |

All shared types live in `src/types/domain.ts`.

### Multi-market panels (`locations.ts` + `marketTargets.ts`)

Each market (`salon-women`, `home-service`, `business-buying`, `business-selling`,
`investment`) gets its own input panel and output:

- **Input**: register locations with `LocationRegistry.register(...)` — salons
  support unlimited branches per market (each with its own address and,
  optionally, its own working hours), while the company currently registers a
  single `office` location with `staffCount: 30`.
- **Output**: `computeMarketPacing` / `computeMarketPacingForAllMetrics` take
  the confirmed count so far today and the current hour, and return a
  real-time/hourly report (`expectedByNowMin`, `onTrackForMin`,
  `remainingNeededForMin`, `requiredPerRemainingHour`, `isAboveMax`) so gaps
  against the daily target are visible hour by hour, not just at day's end.

### What was completed in this change

- Built the entire pipeline described above from scratch (the repository
  previously contained only this README).
- Directly answered the specific gap raised in the request: the video/visual
  session module now **requires** a named primary presenter (`assertPresenterAssigned`)
  before a session can be marked ready, plus a backup presenter and quality
  observer role, a fixed session scenario, and a consent-aware checklist.
- Added a default channel/account map covering every platform mentioned
  (Google, X, Telegram, WhatsApp, Instagram, LinkedIn, Facebook, YouTube,
  Meta Ads, Email, forums, phone, in-person, website) with owner/goal/KPI/access
  fields ready for a technical team to plug in real credentials.
- Added 58 unit tests (Jest) covering every module.
- Added `locations.ts` and `marketTargets.ts` to model the multi-market
  requirement: each market (salon-women, home-service, business-buying,
  business-selling, investment) now has its own location registry (multi-branch
  for salons, single office with a 30-person sales team for the company) and
  its own daily target + real-time/hourly pacing report, so gaps against the
  90-110/50-70/30-40/30/70+ targets from the brief are visible hour by hour.

### What is intentionally still a gap (needs technical-team/business input)

- **Actual message content/voice** for scripts — placeholder bodies are
  seeded; marketing/sales must supply the final wording per brand voice.
- **Named individuals** for channel ownership and video-session presenter
  roles — the code enforces that someone must be assigned, but the specific
  person(s) must be decided by the team.
- **Production-grade auth** for the admin API is a single shared API key
  (`MW_ADMIN_API_KEY`); per-user accounts/RBAC (e.g. username+password or SSO
  with session/JWT tokens) for the dashboard is a follow-up — the entrance
  page (below) is intentionally built as a thin, swappable layer so this key
  check can later be replaced with real per-user login without touching the
  rest of the API/dashboard.

### Persistence, real integrations, and the admin dashboard

Beyond the pure pipeline modules above, the repository now also includes:

| Module | File | Purpose |
|--------|------|---------|
| Persistence | `src/modules/persistence.ts`, `src/modules/postgresRepository.ts` | `Repository<T>` interface with an `InMemoryRepository` default and a `PostgresRepository` (JSONB-per-row) so any module can be backed by Postgres/Supabase. Schema: `migrations/001_init.sql`. |
| Integration credentials | `src/modules/credentialsStore.ts` | Encrypted-at-rest (AES-256-GCM) storage for third-party API keys/tokens (Twilio, WhatsApp, Telegram, Vapi, Zoom, Apollo), keyed by provider, with connection status tracking. Master key from `MW_CREDENTIALS_KEY`. |
| Twilio Lookup | `src/modules/integrationClients/twilioClient.ts` | `TwilioPhoneValidator` calls the real Twilio Lookup v2 API when credentials are configured, and transparently falls back to the existing local-regex validation otherwise. |
| WhatsApp/Telegram send | `src/modules/integrationClients/messageSender.ts` | `MessageSender` actually delivers a script's message text via the WhatsApp Business Cloud API or the Telegram Bot API, with retries. |
| Video/voice sessions | `src/modules/integrationClients/videoSessionProvider.ts` | `VideoSessionProvider` creates a real Zoom meeting, starts a real Vapi outbound call, or attaches a static Google Meet link. |
| Lead enrichment | `src/modules/integrationClients/apolloClient.ts` | `ApolloClient` enriches a lead's contact profile via Apollo.io. |
| Market registry | `src/modules/marketRegistry.ts` | Lets a manager add a brand-new market (with its own working hours and daily target rules) from the dashboard, without a code deploy; merges with the 5 built-in markets for pacing/reporting. |
| Presentation & online-consultation campaigns | `src/modules/presentationCampaigns.ts` | A fully independent module for the "presentation session with online consultation" requirement: `AudienceProfileRegistry` lets a manager change the target-audience text and its goals together (e.g. switch from influencer → company → group → banking sector, with the goals changing accordingly); `CommissionModelRegistry` defines a percentage/flat/tiered commission & collaboration model, optionally scoped to one audience profile/vertical (so picking "banking" people changes the whole commission plan); `ResumeIntakeRegistry` records where a collaborator/candidate's resume came from (Indeed, LinkedIn, a manual link, or an upload); `LandingPageRegistry` defines a single-page site (slug, optional custom domain to point at once hosted, hero text, and any number of manually-added content blocks — words/sentences/addresses — plus the lead-capture fields it should collect), exactly like the manual word/sentence/address editing in the prior project. |
| Admin API | `src/server/` | Express app (`createApp()`) exposing `/api/credentials`, `/api/markets`, and `/api/presentation` (audience profiles, commission models, resumes, landing pages) CRUD + connection-test + pacing endpoints, protected by an `x-api-key` header (`MW_ADMIN_API_KEY`). `GET /api/i18n` is public and returns the EN/FA/AR translation dictionary. |
| Admin dashboard | `public/dashboard/` | Static, dependency-free HTML/JS admin UI (served at `/dashboard`) to add/test/remove every integration connection, manage markets, and — on one "Presentation Campaigns" page — configure audience profiles, commission models, resume intake, and landing pages end-to-end. Includes an EN/FA/AR language switcher that sets text direction (`dir="rtl"` for fa/ar). |
| Entrance / sign-in page | `public/entrance/` | Branded landing page (served at `/entrance`, and `/` redirects here) where an admin enters the `x-api-key` and picks a language (EN/FA/AR) before being sent to `/dashboard`. |

#### Running the admin API + dashboard

```bash
npm install
npm run build
MW_ADMIN_API_KEY=change-me MW_CREDENTIALS_KEY=$(openssl rand -hex 32) npm run start:server
# open http://localhost:3000/  (redirects to the entrance/sign-in page, then /dashboard)
```

Environment variables (see `.env.example`):

- `PORT` — HTTP port (default `3000`).
- `MW_ADMIN_API_KEY` — required in production; requests to `/api/*` must send it as the `x-api-key` header. If unset, the API is open (development only).
- `MW_CREDENTIALS_KEY` — required in production; used to derive the AES-256 key that encrypts stored integration credentials. If unset, a random per-process key is used and all stored secrets are lost on restart.
- `DATABASE_URL` — optional Postgres/Supabase connection string. When set, credentials and custom markets are persisted via `PostgresRepository` using the schema in `migrations/001_init.sql`; when unset, they're kept in memory.

### Deploy (point a domain/host at this app)

The server is a single Express app (`src/server/index.ts`) that serves both
the API and the static entrance/dashboard pages, so putting it live behind a
domain only requires:

1. Build once: `npm install && npm run build`.
2. Set the required environment variables on the host (see table below) —
   nothing else needs manual configuration.
3. Start the process: `npm run start:server` (listens on `PORT`, default
   `3000`).
4. Point your domain/reverse proxy (Nginx, a PaaS load balancer, etc.) at
   that port. `GET /` redirects to `/entrance/` (sign-in), which then sends
   the admin to `/dashboard/`.

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `PORT` | optional (default `3000`) | Port the Express server listens on. |
| `MW_ADMIN_API_KEY` | **required in production** | Shared admin key checked against the `x-api-key` header for every `/api/*` route (except the public `/health` and `/api/i18n`). Without it the API is unauthenticated. |
| `MW_CREDENTIALS_KEY` | **required in production** | AES-256 master key used to encrypt stored third-party credentials (Twilio, WhatsApp, Telegram, Vapi, Zoom, Apollo, social platforms). Without it, a random per-process key is used and all stored secrets are lost on restart. |
| `DATABASE_URL` | optional | Postgres/Supabase connection string. When set, data is persisted via `PostgresRepository` (schema in `migrations/001_init.sql`); when unset, everything is kept in memory and lost on restart. |

No other manual setup is needed — once these environment variables are set
on the host and the domain is pointed at the running process, the entrance
page, dashboard, and API are already connected and ready to use.

### Running

```bash
npm install
npm run build   # type-check & compile to dist/
npm test        # run the Jest test suite
```
