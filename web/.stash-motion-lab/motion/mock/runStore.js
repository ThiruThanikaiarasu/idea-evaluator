import { useSyncExternalStore } from 'react';
import { PERSONAS } from '../personas.js';

// Mock of a running iteration, shaped like what a websocket/poll reducer
// would produce. Everything visual is *derived* from (Date.now() - startedAt),
// and the record persists in sessionStorage — so unmounting, navigating away,
// or a full page reload resumes mid-run instead of restarting animations.
//
// To wire the real backend: keep this store's shape and subscribe API, and
// replace startRun/retry/startMentor with handlers that write server events
// ({ reviewerId, status } / { mentorStep }) into the same state.

const KEY = 'roast-motion-lab-run-v1';
const listeners = new Set();

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

let state = load();

function emit() {
  state = state ? { ...state } : null;
  if (state) sessionStorage.setItem(KEY, JSON.stringify(state));
  else sessionStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

const rand = (min, max) => min + Math.random() * (max - min);

export const runStore = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,

  startRun() {
    const now = Date.now();
    state = {
      startedAt: now,
      reviewers: Object.fromEntries(
        PERSONAS.map((p) => [
          p.id,
          {
            startedAt: now,
            duration: Math.round(rand(6000, 10000)),
            // Competitor is scripted to fail on the first attempt so the
            // failure/retry language is always visible in the demo.
            outcome: p.id === 'competitor' ? 'failed' : 'done',
            attempt: 1,
          },
        ]),
      ),
      mentor: null,
    };
    emit();
  },

  retry(id) {
    const r = state?.reviewers?.[id];
    if (!r) return;
    r.startedAt = Date.now();
    r.duration = Math.round(rand(3500, 6000));
    r.outcome = 'done';
    r.attempt += 1;
    emit();
  },

  // Steps are stored (not recomputed) so a reload resumes the same sequence.
  startMentor(steps) {
    if (!state) this.startRun();
    state.mentor = {
      startedAt: Date.now(),
      steps, // [{ label, d }] in ms
      duration: steps.reduce((sum, s) => sum + s.d, 0),
    };
    emit();
  },

  reset() {
    state = null;
    emit();
  },
};

export function useRun() {
  return useSyncExternalStore(runStore.subscribe, runStore.get);
}

// Derives a reviewer's presentational status from the clock.
export function reviewerStatus(reviewer, now) {
  if (!reviewer) return 'idle';
  return now - reviewer.startedAt >= reviewer.duration ? reviewer.outcome : 'running';
}
