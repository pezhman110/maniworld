# Kids Music Studio 🎤🎶

A standalone, viral-ready digital music studio for kids — pick a song, build
it with guided tools (solo or with friends), record your part, mix it, and
get an auto-generated recap video ready to share — starting at ages **6-9**,
in both a **home** version and a **classroom** version.

> **Independent project.** This lives in its own folder with its own
> `package.json` / `tsconfig.json` / `jest.config.js` so it never gets built,
> tested, or deployed together with the unrelated Mani World CRM in the
> repository root (`src/`) or the separate `social-skills-game/` product.
> Treat this folder as a separate product.

## The pitch

A kid opens the app, picks a song they love (or their teacher picks one for
the class), builds it step-by-step with kid-friendly tools, sings their part,
hears it all mixed together, and watches a little "behind the scenes" video
of themselves and their friends making it — which the app can post to its own
in-app social feed to pull more kids in. Every tool, every mode, and every
share loop is designed to keep the experience *inside* the app instead of
sending kids out to external tools.

## Core flow

1. **Pick a song** (`songCatalog.ts` + `sessionMode.ts`)
   - **Solo**: the child searches the catalog by their own interests
     (animals, space, silly songs, ...).
   - **Group**: a coach/teacher (or the system) picks a song with enough
     parts for everyone, and parts are assigned round-robin across the group.
2. **Build it** (`creationTools.ts`): guided, ordered steps through a small
   toolkit (beat pads, melody keys, lyric helper, fun effects) — a simple,
   friendly "mini pro studio" rather than a blank, intimidating DAW.
3. **Record your part** (`voiceRecording.ts`): each participant's part moves
   through `pending -> recorded -> approved` (or `rejected` for a re-take).
4. **Mix it** (`mixEngine.ts`): once every part is approved, the mix becomes
   ready and can be finalized into one final track.
5. **Auto-generate a recap video** (`videoRecap.ts`): once the mix is final,
   a recap record is created referencing everyone who took part.
6. **Share it** (`viralShare.ts` + `safetyModeration.ts`): the recap can only
   be auto-posted to the in-app social feed once **every** participant has
   **granted parental consent** *and* the recap has **passed moderation** —
   there is no way to skip this gate.

## Home vs. classroom mode

- **Home**: individual participants, dual-reward friend invites
  (`InviteRegistry`), and parent-facing progress reports
  (`DashboardService.buildParentReport`).
- **Classroom** (`classroomRegistry.ts`): a teacher owns a `Classroom` of
  students and assigns group sessions as classroom projects instead of
  individual invites; `DashboardService.buildTeacherReport` rolls this up
  into a teacher-facing report (students engaged, active group challenges).

## Viral growth mechanics (kid-safe by design)

Mirrors the safety-first approach used in `social-skills-game/src/modules/viral.ts`:

- **Dual-reward invites** (`InviteRegistry`): an invite code rewards *both*
  the inviter and the invitee once redeemed — no one-sided incentive.
- **Group challenges** (`GroupChallengeRegistry`): a parent/teacher-created
  challenge "activates" once enough members join — a *collective* threshold,
  not a 1:1 leaderboard between kids.
- **Auto-share, gated** (`ShareRegistry.autoShare`): a recap is only posted to
  the in-app feed after consent + moderation clear for every participant in
  it; otherwise it throws `RecapNotClearedToShareError`.
- **Shareable recap text** (`buildShareableRecapText`): friendly, achievement-
  style copy, never a competitive ranking.

## Safety & ethics (baked into the design)

- No public 1:1 ranking between kids — only collective/group thresholds.
- No direct-to-child advertising; monetization targets parents, not the child.
- Any recorded voice/video content requires **explicit parental consent**
  (`ParentalConsentRegistry`) **and** a passed **moderation review**
  (`ModerationQueue`) before it can be shared anywhere outside the child's
  own session — enforced by `isClearedToShare` / `ShareRegistry.autoShare`.

## Scope note: real audio/video processing

This project models the **registries, state machines, and data contracts**
around the studio pipeline (what song, whose part, what recording state,
what the final mix/recap look like). It intentionally does **not** perform
real audio capture, mixing, or video rendering — those require external
media services (recording SDK, audio mixing service, video render pipeline)
that are out of scope here, exactly like the "not the media pipeline itself"
scope note in `social-skills-game`'s README.

## Project layout

```
music-studio-game/
├── src/
│   ├── types/domain.ts            # all domain types
│   ├── modules/
│   │   ├── songCatalog.ts         # SongCatalogRegistry: catalog + interest search + group suggestions
│   │   ├── sessionMode.ts         # MusicSessionRegistry: solo/group sessions + part assignment
│   │   ├── creationTools.ts       # CreationToolkitRegistry: tools + guided step progress
│   │   ├── voiceRecording.ts      # VoiceRecordingRegistry: per-part recording state machine
│   │   ├── mixEngine.ts           # MixEngine: readiness check + final mix record
│   │   ├── videoRecap.ts          # VideoRecapService: auto-generated recap video record
│   │   ├── safetyModeration.ts    # ParentalConsentRegistry + ModerationQueue + isClearedToShare
│   │   ├── viralShare.ts          # InviteRegistry + GroupChallengeRegistry + ShareRegistry
│   │   ├── classroomRegistry.ts   # ClassroomRegistry: teacher/classroom/student/project model
│   │   └── parentTeacherDashboard.ts # DashboardService: parent + teacher reports
│   └── index.ts                   # barrel export
└── tests/                         # one Jest suite per module
```

## Scripts

```bash
npm install
npm run build   # tsc -p tsconfig.json
npm test        # jest
npm run lint    # tsc --noEmit -p tsconfig.json
```
