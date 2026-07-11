# My Living City 🏙️ (`/mycity`)

A safe, **never-ending** living-city builder for kids aged **6-9**, where a
child pieces together their *own* real world — home, street, family,
friends, pets, everyday routines (شهر زنده) — from typed/spoken/archived
sentences that become professional cartoon stickers.

> **Independent project.** This lives in its own folder with its own
> `package.json` / `tsconfig.json` / `jest.config.js` so it is never built,
> tested, or deployed together with the unrelated Mani World CRM in the
> repository root (`src/`), the older weekly-mission city game in
> `maniworld-city-game/` (the original `/city` module), or the other
> standalone kids' games (`music-studio-game/`, `social-skills-game/`,
> `superhero-builder-game/`). **"My Living City" (`/mycity`) is a
> completely separate module from the superhero-creation studio** —
> building a city must never be conflated with building a superhero
> character.

## Out of scope (external services/infra — same boundary as every sibling project)

- Real Gemini 3 Pro Image / Nano Banana cartoon-image generation
- Real browser Speech-to-Text (STT) capture
- Real `MediaRecorder` + PIP + `ffmpeg.wasm` video recording/encoding
- Real OS/app push-notification delivery
- Real database/localStorage/cloud wiring (Lovable Cloud, Postgres, etc.)

Everything in this project models the product as **registries / state
machines** — inspectable, testable business logic that a real frontend and
real AI/media services can be wired up against later.

## Requirement blocks → modules

| # | Requirement | Module(s) |
|---|---|---|
| 1 | Input methods: typed / voice / archive-sticker only, no preset buttons | `src/modules/inputMethods.ts` |
| 2 | Unlimited nested location tree: City → Zone → Building → Floor → Room → 8×8 item grid | `src/modules/sceneTree.ts` |
| 3 | Professional cartoon sticker generation lifecycle + "My Box" + 6-icon fallback kit | `src/modules/stickerStudio.ts` |
| 4 | Residents: person/animal/role, nickname-only, avatar, mood, note, location | `src/modules/residents.ts` |
| 5 | Events (birthday/outing/party/visit); uploaded photos counted only, never persisted | `src/modules/events.ts` |
| 6 | Coach Mani: step-by-step motivational guidance with the "little architect" mascot | `src/modules/coachMani.ts` |
| 7 | Parent view: PIN-gated (default `1234`), non-analytic summary + soft nudge at ≥50% hard mood | `src/modules/parentView.ts` |
| 8 | Safety red lines (COPPA/PDPL): no real child photos, no last name/address, no online-status exposure, no raw image persistence, aggregate-only classroom composition | `src/modules/parentSafety.ts` |
| 9 | The 9 mandatory platform-wide rules (design tokens, dedicated mascot, i18n, viral share, no ceilings, archive, media export, cross-posting) | `src/modules/platformRules.ts`, `shareLinks.ts`, `archive.ts`, `mediaOutputs.ts`, `crossPosting.ts` |
| 10 | Back navigation everywhere + language switch is app-wide, not per-page | `src/modules/backNavigation.ts`, `LocaleString` used throughout `src/types/domain.ts` |
| 11 | Explicit separation from the superhero-creation studio | This README + isolated `package.json`/folder |
| 12 | Persistence contract matching `mycity_scenes` (`saveScene`/`listScenes`/`deleteScene`) | `src/modules/sceneStorage.ts` |

## Extra features folded in

| Feature | Module |
|---|---|
| "Your city is alive, come back!" push nudges | `src/modules/notifications.ts` |
| Wallet / allowance / shop purchases | `src/modules/economy.ts` |
| Parent-configurable screen-time windows for games vs. TV | `src/modules/screenTimeSchedule.ts` |
| Daily leaderboard ("today's top city"), celebratory not shaming | `src/modules/leaderboard.ts` |
| Collapse/archive a city without ever hard-deleting or "finishing" it | `src/modules/collapseCity.ts` |

## Safety principles baked into the code

- **Never a full name.** `residents.ts` validates every nickname and
  rejects anything that looks like a first+last name or an address.
- **Never a raw photo.** `events.ts` only ever increments
  `uploadedPhotoCount`; the raw bytes are never accepted as a field to
  persist, and `parentSafety.ts` exposes `assertNeverPersistRawImage` as a
  hard guard.
- **No "who's online" between children.**
  `parentSafety.ts#assertNoOnlineStatusExposure` throws if this is ever
  attempted.
- **Classroom composition is aggregate-only** (count/girl/boy/average age)
  — never names or faces (`parentSafety.ts#buildClassroomComposition`).
- **Sharing is always gated** by parental consent AND moderation
  (`parentSafety.ts#isClearedToShare`), before a share link, media export,
  or cross-post can ever be produced.
- **No scripted/automated posting.** `crossPosting.ts` only ever queues
  destinations behind the platform's own official API or share sheet —
  official-API-first, manual-fallback otherwise — consistent with this
  repository's compliance convention of never automating around a
  platform's Terms of Service.
- **Non-punitive competition.** `leaderboard.ts` frames the daily ranking
  around celebrating "today's top city", never shaming lower-ranked ones.
- **The city never ends.** `collapseCity.ts` only ever folds a city away
  (soft, reversible); there is no "finished"/terminal state.

## Development

```bash
npm install
npm run lint   # tsc --noEmit
npm test       # jest
npm run build  # tsc -p tsconfig.json -> dist/
```
