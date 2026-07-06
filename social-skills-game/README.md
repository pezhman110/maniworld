# Social Skills Game 🎮🤝

A standalone, viral-ready digital game that teaches kids social and character
skills through short interactive quests — starting at ages **6-9** and
automatically scaling up with the child as they grow.

> **Independent project.** This lives in its own folder with its own
> `package.json` / `tsconfig.json` / `jest.config.js` so it never gets built,
> tested, or deployed together with the unrelated Mani World CRM in the
> repository root (`src/`). Treat this folder as a separate product.

## The pitch

**"Skillville"** — a world where a child's avatar grows up alongside them.
Every social skill mastered unlocks a new avatar item and a badge; every
invited friend unlocks a new 2-player mini-game; and every birthday
automatically opens a bigger, more grown-up part of the world. It's a game
that grows with the child, and grows *faster* with every friend they bring
along.

## Concept

- **Micro-story quests**: each skill is practiced through a short
  choose-your-path story or an interactive mini-game (e.g. drag-and-match
  facial expressions, turn-taking simulations, dialogue-choice scenarios).
- **Avatar + badges**: completing quests earns customizable avatar items and
  collectible skill badges (bronze → silver → gold, based on repeated
  successful practice, not one-off luck).
- **Parent/teacher dashboard**: tracks skill growth (not just game score),
  with home-practice suggestions.

## Age bands (skills accumulate, they never get swapped out)

| Band | Ages | New skills added |
|---|---|---|
| Little Explorers | 6-9 | Greeting & introducing yourself, active listening, sharing & turn-taking, expressing feelings in words, asking for/giving help, apologizing & owning mistakes, simple empathy, making friends, handling losing gracefully, following group rules |
| Rising Leaders | 10-12 | Resolving disagreements with words, simple negotiation, teamwork on shared projects, managing peer pressure, recognizing & reporting bullying |
| Confident Voices | 13-15 | Communicating well online, setting healthy boundaries, managing complex emotions, leading a small group |
| Future Leaders | 16+ | Interview & presentation skills, advanced emotional intelligence, managing team conflict, cross-cultural communication |

A child at age 12 has **all 15** skills from the first two bands unlocked; a
16-year-old has all **19** skills across every band. Age bands are
configuration (`AgeBandRegistry`), not hardcoded branches, so bands/ages/skills
can be tuned without touching the engine.

## Automatic age-based dashboard updates

`DashboardService.checkForAgeBandTransition(childProfile)` detects the moment
a child's computed age crosses into a new band and returns:
- the newly unlocked skill ids for that band,
- a celebratory transition message (e.g. *"Congratulations! You leveled up to
  the 10-12 skill world..."*),

so the dashboard/parent-report can surface it immediately, without any manual
configuration per child.

## Viral growth mechanics (kid-safe by design)

- **Dual-reward invites** (`InviteRegistry`): a shareable invite code rewards
  *both* the inviter and the invitee once redeemed, unlocking 2-player
  mini-games that need a real friend to play.
- **Group challenges** (`GroupChallengeRegistry`): a parent/teacher creates a
  weekly challenge for a class or family; it "activates" once enough members
  join — a *collective* threshold, not a 1:1 leaderboard, so there's no
  competitive pressure between individual kids.
- **Shareable badge cards** (`buildShareableBadgeCardText`): a positive,
  non-competitive achievement card parents can share ("Sara just earned the
  GOLD badge for...").

## Safety & ethics (baked into the design)

- No public 1:1 ranking between children — only collective/group thresholds.
- No direct-to-child advertising; monetization targets parents (subscription),
  not the child.
- Reward payloads are cosmetic avatar items, not real-world purchases.
- Any user-generated content (e.g. voice recordings) would require explicit
  parental consent and moderation before being shared — this repository only
  models the reward/registry layer, not the media pipeline itself.

## Project layout

```
social-skills-game/
  src/
    types/domain.ts       # Shared domain types
    modules/
      ageBands.ts          # Age-band rules + age computation
      skills.ts            # Skill registry (seeded per age band, cumulative)
      childProfile.ts      # Child profile registry
      questEngine.ts        # Quest attempt bookkeeping -> skill progress
      badges.ts             # Bronze/silver/gold tier logic
      viral.ts               # Invite codes + group challenges + share text
      dashboard.ts           # Age-transition detection + parent report
  tests/                   # Jest unit tests for every module
```

## Running it

```bash
cd social-skills-game
npm install
npm run build   # tsc type-check + emit
npm test        # jest unit tests
```

## Suggested next steps for a real product build

1. Add a persistence layer (Postgres/SQLite) behind the in-memory registries.
2. Build the actual quest content (story/dialogue trees, mini-game assets).
3. Add a REST/GraphQL API layer + a real parent/teacher dashboard UI.
4. Add authentication scoped to parent accounts (children never log in
   directly with personal credentials).
5. Legal review for COPPA / GDPR-K compliance before collecting any data
   from real children.
