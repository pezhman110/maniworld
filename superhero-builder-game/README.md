# Kids Superhero Builder 🦸🎨

A standalone superhero-creation app for kids **6-9**: describe a character,
watch AI turn it into art, refine it, pick a type, set gender/energies,
build tools and a home for it, then trade/collect/print it in a marketplace.

> **Independent project.** This lives in its own folder with its own
> `package.json` / `tsconfig.json` / `jest.config.js` so it never gets
> built, tested, or deployed together with the unrelated Mani World CRM in
> the repository root (`src/`) or the other kids' products
> (`maniworld-city-game/`, `music-studio-game/`, `social-skills-game/`).
> Treat this folder as a separate product.

## The pitch

A kid describes an animal, object, or character (typed, or spoken out loud
if they can't type yet) and an AI turns it into artwork. They review it —
"this is fine" or "change this" — until they're happy, then pick one of a
handful of suggested character types, set the gender and give it one or
more powers (what it looks like, what it does, and when it turns on). They
can optionally add gear/tools and a home, each going through the same
"AI draft -> approve or revise" loop, then decide whether to keep building
another character. Finished characters go into a marketplace where other
kids can buy them (coins always go to the original creator), optionally
personalized with a 3D-printed statue under the buyer's own name. Collect
52 cards and the app auto-builds a custom game from your collection, which
you can list, print with your own logo, and ship physically.

## Core flow

1. **Describe your character** (`characterConcept.ts`): text or voice
   description -> `pending-generation` -> AI artwork ready ->
   `generated` -> the child reviews it: `requestRevision` (say what to
   change, back to `pending-generation`) or `approve` (no changes needed).
   Once approved, the system offers **7-10** suggested character types to
   pick from.
2. **Set traits** (`characterTraits.ts`): choose a name, gender (girl/boy)
   and add one or more powers/energies — description, effect, and the
   condition that turns the power on. Every character must have a name (it
   is later burned into the promo video and marketplace listing). The
   roster is capped (default **5** characters per creator, shown at the top
   of the screen; configurable for later upgrade tiers).
3. **Build tools** (`toolBuilder.ts`) — *optional, can be skipped*: for
   each tool, describe it, review the AI draft ("no-change" or
   "with-change" -> regenerate), from a deliberately varied catalog
   (weapon, vehicle, gadget, costume accessory, shield, pet companion,
   communicator...). Tier 1 caps the number of *distinct categories* used
   (default **3**, shown at the top of the screen; configurable).
4. **Build a habitat** (`habitat.ts`): same review cycle for where the
   character lives. Ends with a yes/no: "want a home for this character?"
   — yes moves to the next character, no closes this one out as-is
   (the character is still saved either way).
5. **List it / trade it** (`marketplace.ts`): finished characters can be
   listed with independent prices for a digital purchase, a printed card
   with the buyer's own logo, and physical shipping. Coins from every sale
   go to the original creator; if a buyer wants the character personalized
   under their own name, a 3D-statue print order is created alongside the
   purchase.
6. **Collect cards** (`cardCollection.ts`): every finished character can
   become a collectible card. Reach **52** cards and the app
   auto-generates a custom game from the collection, lists it in the
   marketplace under the creator's name, and offers own-logo printing and
   physical shipping (again at separate prices).
7. **Confirm it's final** (`characterFinalization.ts`): closing out a
   character (finishing the habitat step, or skipping straight to done)
   starts a confirmation window — a configurable number of days (default
   **2**) during which the child can still come back and ask for changes.
   Any such request reopens the character and restarts the window. Once
   the window elapses untouched, the character is confirmed final — the
   signal the promo video studio waits for.
8. **Auto-generate a promo video** (`promoVideoStudio.ts`): once a
   character is confirmed final, a fixed **30-second** promo video is
   requested for it, always overlaying the studio name and the character's
   own name (e.g. "Mani World Studio presents: Silver Fox"). Like every
   other artwork step, real video rendering is an external motion-design
   service — this module only tracks the request/status/caption. Before it
   can go out to social media it must clear the same parental-consent +
   moderation gate as marketplace listings and prints, then is queued for
   upload to one or more destinations (Instagram, Facebook, TikTok,
   LinkedIn, YouTube Shorts) following an official-API-first,
   manual-fallback discipline — nothing is ever assumed to have posted
   successfully.
9. **See it all in one place** (`creatorDashboard.ts`): an aggregated,
   embeddable summary (characters, tools, habitats, cards, custom games,
   active listings, promo videos) meant to be shown as a tab inside the
   same dashboard app used by the other Mani World products — including a
   flag for whether the creator has paid-tier access to a 3D viewer for
   rotating their characters/tools (real 3D rendering is out of scope
   here; only the access flag is modeled).
10. **Voice input** (`voiceInput.ts`): any typed step can instead be a voice
    note (`pending -> recorded -> approved`), for kids who can't type yet.
11. **Parental safety** (`parentSafety.ts`): explicit parental consent AND a
    passed moderation review are both required before anything is listed
    in the marketplace, sent to physical print/shipping, or posted to
    social media as a promo video — there is no way to skip this gate.

## Scope note

Real AI image generation, 3D-figurine rendering/printing, physical card
printing/shipping, video rendering, and voice/audio capture all require
external services. This project only models the registries, state
machines, and data contracts around that pipeline — it does not generate
images or video, render 3D models, print/ship anything, record audio, or
call any social platform API itself.

## Development

```bash
npm install
npm run build   # tsc -p tsconfig.json
npm test        # jest
npm run lint    # tsc --noEmit -p tsconfig.json
```
