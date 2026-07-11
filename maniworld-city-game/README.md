# ManiWorld — City of Little Creators 🏙️🤖

A safe, weekly creative-achievement city-building game for kids aged **6-9**,
where a child builds a living city, programs helper robots, consults their
family on big decisions, and produces beautiful, parent-approved keepsakes
worth sharing.

> **Independent project.** This lives in its own folder with its own
> `package.json` / `tsconfig.json` / `jest.config.js` so it never gets built,
> tested, or deployed together with the unrelated Mani World CRM in the
> repository root (`src/`), or with the other standalone kids' games
> (`music-studio-game/`, `social-skills-game/`). Treat this folder as a
> separate product.

## The pitch

Not just "my city builder", but **"our city" + "my living home"**: the city
is where the child completes weekly missions; the home is where every
creative output (paintings, storybooks, city videos, music, robots,
inventions, kindness-garden entries, honor badges, diary pages, weekly
albums) lives on display, so a parent doesn't just see a game level — they
see a whole creative home their child built.

## Modules

| Module | File | What it models |
|---|---|---|
| Age adaptation | `src/modules/ageAdaptation.ts` | Per-year (6/7/8/9) cumulative complexity unlocking — icons/voice only at 6, up to team projects & detailed reports at 9. |
| My Living Home | `src/modules/livingHome.ts` | The child's personal exhibit rooms (painting wall, storybook shelf, city TV, piano, robot garage, invention room, kindness garden, honor board, city diary, weekly album). |
| City Builder | `src/modules/cityBuilder.ts` | Resources, buildings, build costs, and "City Emotions" (buildings thrive/wither based on resource health). |
| Visual Robot Coding | `src/modules/robotCoding.ts` | ScratchJr-style blocks (go-to, pick-up, drop-off, if, repeat, wait, help, return) with simulated sequencing/conditional/loop execution. |
| Weekly Mission | `src/modules/weeklyMission.ts` | The fixed 7-day weekly structure (naming & opening → first building → resource problem → robot planning → family consultation → team project → closing festival). |
| Family Council (incl. Sibling/Grandparent Mode) | `src/modules/familyCouncil.ts` | QR-style proposals with role-limited voting (parent/sibling/grandparent) — non-parent roles can only vote/cheer, never chat or administer accounts. |
| Parent Safety | `src/modules/parentSafety.ts` | Verifiable parental consent (COPPA-style methods), a moderation queue with an SLA check, a regional-compliance toggle (Iran vs. UAE minimum social-account age), and a data-retention/auto-delete registry. |
| Safe Internal Expo | `src/modules/safeExpo.ts` | The "Safe Friends' City Expo" — nickname + avatar only, sticker-only reactions, no free chat/DMs, gated by consent + moderation. |
| Viral outputs | `src/modules/viralOutputs.ts` | Multi-format shareable artifacts (highlight video, micro-trailer, parent pride card, news report, storybook) plus the Referral Reward Loop (dual "friendship badge", never a monetary/ad reward). |
| Growth Map | `src/modules/growthMap.ts` | Turns in-game actions into a parent-facing weekly skill report (logical thinking, problem-solving, decision-making, collaboration, resource management, creativity, storytelling, kindness, responsibility). |
| Retention engine | `src/modules/retentionEngine.ts` | Memory-count "streaks" (never a fragile day-streak) plus warm, non-punitive comeback messages after inactivity. |
| Special events | `src/modules/specialEvents.ts` | Birthday/membership-anniversary celebrations and region-aware seasonal/cultural events (Nowruz, Ramadan & Eid, Yalda, UAE National Day). |

## Safety principles baked into the code

- **No open chat, no DMs, no public child profiles.** The only child-to-child
  interaction is a fixed set of sticker reactions (`safeExpo.ts`).
- **Nothing is shareable until it clears both parental consent AND content
  moderation** (`isClearedToShare` in `parentSafety.ts`), whether the
  destination is the internal expo or a parent's own download.
- **The app never posts directly to any external social network** — viral
  artifacts are only ever prepared for the parent to download/share
  themselves.
- **Data minimization**: `ChildProfile` stores only a nickname, age, and a
  parent-contact reference — no full name, school, address, or default real
  photo.
- **Region-aware compliance**: `RegionalComplianceRegistry` encodes the UAE's
  higher minimum age (15) for a child's own social-interaction identity vs.
  other regions (13), as swappable config rather than a hardcoded branch.
- **Non-punitive retention**: `retentionEngine.ts` deliberately counts
  memories made (never consecutive-day streaks) and sends kind, guilt-free
  comeback nudges.

## Development

```bash
npm install
npm run lint   # tsc --noEmit
npm test       # jest
npm run build  # tsc -p tsconfig.json -> dist/
```
