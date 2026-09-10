// Mirrors the real personas in src/main.jsx, plus the loading-state copy.
// `phrases` cycle while the agent runs — in-character, plausible work,
// never a generic "Thinking...".
export const PERSONAS = [
  {
    id: 'cto',
    initials: 'CT',
    name: 'Skeptical CTO',
    role: 'Feasibility & scale',
    hue: 210,
    phrases: [
      'checking scale assumptions',
      'cross-referencing infra costs',
      'stress-testing the data model',
      'pricing out the cloud bill',
      'hunting for the operational trap',
    ],
    teaser: 'Feasible, but your infra assumption breaks around 10k users. Two hard questions inside.',
    analysis: [
      'The core loop is buildable in a weekend, and that is exactly what worries me. The moment reviews run in parallel you inherit queueing, retries, and partial failure — none of which your story mentions.',
      'Your implicit cost model assumes one LLM call per review. Real usage will be 3–5 calls once you add retries and synthesis, which changes the unit economics before you ever hit scale.',
    ],
    questions: ['What happens when one reviewer times out mid-iteration?', 'Who pays for iteration 7 of a free user?'],
  },
  {
    id: 'user',
    initials: 'BU',
    name: 'Bored User',
    role: 'Usefulness & retention',
    hue: 40,
    phrases: [
      'asking why I would open this twice',
      'comparing this to doing nothing',
      'looking for the 10-second payoff',
      'checking if it fits an existing habit',
    ],
    teaser: "I'd try it once. You have ten seconds to show me why I'd ever come back.",
    analysis: [
      'The first roast is genuinely fun — novelty carries it. But my second idea gets the same four voices saying structurally similar things, and I can feel the template underneath.',
      'The retention hook has to be the iteration loop, not the roast. Show me my idea getting measurably sharper between iterations or I churn after session one.',
    ],
    questions: ['What does iteration 3 give me that iteration 1 did not?', 'Why is this better than pasting into a chat window?'],
  },
  {
    id: 'competitor',
    initials: 'CP',
    name: 'Competitor',
    role: 'Alternatives & differentiation',
    hue: 0,
    phrases: [
      'sizing up your wedge',
      'checking how fast this is copyable',
      'scanning for actual defensibility',
      'war-gaming a fast follow',
      'bundling this into an existing product',
    ],
    teaser: 'Copyable in a quarter. Your only moat right now is taste and speed — details inside.',
    analysis: [
      'Any incumbent with a chat product ships "multi-persona critique" as a feature flag, not a product. The four personas are prompt engineering, and prompt engineering does not defend.',
      'Your real asset is the accumulated iteration history per idea — that is data an incumbent cannot copy. Lean the product hard into the longitudinal record, not the one-shot roast.',
    ],
    questions: ['What do you own after 100 users that a copycat would not?', 'Why does this need to be a standalone app?'],
  },
  {
    id: 'friend',
    initials: 'HF',
    name: 'Honest Friend',
    role: 'Scope & founder reality',
    hue: 150,
    phrases: [
      'reading between the lines',
      'finding the question you are avoiding',
      'noting what genuinely excites me here',
      'drafting the uncomfortable question',
    ],
    teaser: "You're avoiding the pricing question. Also, you've scoped a v3 and called it a v1.",
    analysis: [
      'You light up describing the Review Room and go quiet on who pays. That asymmetry is the tell — the fun part is designed, the business part is deferred.',
      'The honest version of v1 is one idea, one roast, one mentor pass. Iterations, artifacts, and history are all v2. Ship the small thing and see if anyone comes back on their own.',
    ],
    questions: ['If nobody could ever pay for this, would you still build it?', 'What are you cutting to ship in two weeks?'],
  },
];

export const PHRASE_MS = 2800; // judgment call: slow enough to read, fast enough to feel alive
