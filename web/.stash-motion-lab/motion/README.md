# Motion system

A self-contained motion/transition/zero-CLS module for the idea evaluator.
Demo entry: `npm run dev` → open `/motion-lab.html`. Nothing here touches
`src/main.jsx`; graft the pieces into the real app as you build screens out.

## The vocabulary (tokens.css / tokens.js — keep in sync by hand)

| Tier | Value | Use for |
|---|---|---|
| `--dur-micro` | 120ms | hover, press, focus rings, save pulses |
| `--dur-state` | 250ms | crossfades, tab switches, running→done |
| `--dur-layout` | 400ms | page transitions, shared elements, height changes |

Curves: `--ease-out` (entrances/feedback), `--ease-in-out` (moves/size
changes), `--ease-in` (exits only). One spring (`SPRING` in tokens.js) for
anything physical: progress bar, sliding indicators, shared-element moves.
**Rule: no duration or curve appears anywhere except through these tokens.**

## Primitives (`primitives/`)

- **`Skeleton` / `SkeletonLines`** — dimensions are required props; a skeleton
  must reserve the final content's real size.
- **`SlotSwap`** — a fixed-height slot that crossfades content when `stateKey`
  changes. This is the zero-CLS workhorse: tile status lines, footers, the
  "N of 4 done" counter, and the mentor output cards all swap through it.
- **`AnimatedHeight`** — ResizeObserver-measured height animation for content
  that legitimately changes size (expanding question list, growing textarea
  areas). Use only where a fixed slot genuinely can't work.
- **`SavePulse`** — in-place "Saved ✓" confirmation in a fixed-width slot.
- **`stagger.js`** — shared variants for staggered list/grid entrances.

## Zero-CLS rules applied here

- Persona tiles: fixed 224px height, three fixed-height internal zones
  (status 52px, scanline 3px, footer 40px). running/done/failed swaps move nothing.
- Mentor output: both cards render at full size (300px) with skeletons from
  first paint; completion only crossfades their contents.
- Idea board: skeleton rows at the exact final row height (92px), count =
  last-known list length (seed length in the mock).
- Reserved-slot everything: the room CTA, save pulses, status badges, and the
  tile scanline all occupy their space before they have content.
- System font stack; if you add a web font, use `font-display: optional` or
  preload it (note in tokens.css).

## Swapping mocks for the real backend

`mock/runStore.js` is shaped like a websocket/poll reducer. All animation
state is **derived from timestamps** (`Date.now() - startedAt`), never stored —
that's what makes resume-after-reload free (state persists in sessionStorage;
try reloading mid-run).

To go real:
1. Keep the store shape (`reviewers[id] = { startedAt, ... }`, `mentor`) and
   the `subscribe`/`useRun` API.
2. Replace the scripted `duration`/`outcome` fields with a `status` field
   written by server events; change `reviewerStatus()` to read it directly.
3. Persona phrase cycling and mentor step estimates stay client-side (they're
   presentation). Let the mentor's **last step hold** until the real
   completion event, then flip `finished`.
4. Reflections/instruction currently live in module maps — point `onType`
   debounces at your SQLite endpoints.

## Judgment calls to tune

- Phrase cycle **2.8s** (`PHRASE_MS`), per-tile phase offset **1.1s·index**,
  breathing-glow delay **140ms·index**, entrance stagger **90ms** — all chosen
  so the four tiles never sync up.
- Mock reviewer durations **6–10s**, retry **3.5–6s**; Competitor is scripted
  to fail on attempt 1 so the failure/retry language always shows.
- Mentor step estimates: 1.8s reflections, 2.2s per weighed persona, 3.2s
  drafting, 2.2s tightening (~12s with all four included).
- All in-character "thinking" phrases and done-state teasers in `personas.js`
  are placeholder copy — they should eventually come from (or be validated
  against) each persona's actual system prompt so the theater matches reality.
- Save pulse shows for **1.6s**; autosave debounce **900ms**.
- Failed-tile shake is deliberately small (3px, one cycle); delete
  `mlab-shake` if it reads as jokey.
