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

All shared types live in `src/types/domain.ts`.

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

### What is intentionally still a gap (needs technical-team/business input)

- **Real API credentials & OAuth integrations** for each social platform are
  not included — the channel map only defines the *structure* (owner, goal,
  KPI, access level); a technical team must supply real account handles and
  API keys.
- **Persistent storage** (database) — all modules currently operate on
  in-memory collections suitable for unit testing and as a reference
  implementation; a production deployment needs a real datastore.
- **Actual message content/voice** for scripts — placeholder bodies are
  seeded; marketing/sales must supply the final wording per brand voice.
- **Named individuals** for channel ownership and video-session presenter
  roles — the code enforces that someone must be assigned, but the specific
  person(s) must be decided by the team.

### Running

```bash
npm install
npm run build   # type-check & compile to dist/
npm test        # run the Jest test suite
```
