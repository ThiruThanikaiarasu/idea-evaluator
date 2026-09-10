import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { PERSONAS } from '../personas.js';
import { runStore, useRun, reviewerStatus } from '../mock/runStore.js';
import { useNow } from '../mock/useTicker.js';
import { SlotSwap } from '../primitives/SlotSwap.jsx';
import { Skeleton, SkeletonLines } from '../primitives/Skeleton.jsx';
import { SavePulse } from '../primitives/SavePulse.jsx';
import { SPRING } from '../tokens.js';

// Step labels are generated from what the user actually selected, so the
// wait reads as "working on YOUR input", not generic AI-loading theater.
// Durations are estimates for the mock; against the real backend, let the
// last step hold until the completion event arrives.
function buildSteps(includedIds) {
  const included = PERSONAS.filter((p) => includedIds.includes(p.id));
  return [
    { label: 'Reading your reflections', d: 1800 },
    ...included.map((p) => ({ label: `Weighing the ${p.name}'s feedback`, d: 2200 })),
    { label: 'Drafting the pitch angle', d: 3200 },
    { label: 'Tightening the revised evaluation input', d: 2200 },
  ];
}

function stepIndexAt(steps, elapsed) {
  let acc = 0;
  for (let i = 0; i < steps.length; i++) {
    acc += steps[i].d;
    if (elapsed < acc) return i;
  }
  return steps.length;
}

export function MentorSynthesis() {
  const run = useRun();
  const now = useNow(250);
  const [included, setIncluded] = useState(() => PERSONAS.map((p) => p.id));
  const [instruction, setInstruction] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);

  const mentor = run?.mentor;
  const elapsed = mentor ? now - mentor.startedAt : 0;
  const finished = mentor && elapsed >= mentor.duration;
  const currentStep = mentor ? stepIndexAt(mentor.steps, elapsed) : -1;

  const onInstruction = (value) => {
    setInstruction(value);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedAt(Date.now()), 900);
  };

  const toggle = (id) =>
    setIncluded((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  if (!mentor) {
    return (
      <div className="mlab-panel-summary">
        <p className="mlab-eyebrow">Panel input summary</p>
        <h2>What should the mentor weigh?</h2>

        <ul className="mlab-include-list">
          {PERSONAS.map((p) => {
            const status = run ? reviewerStatus(run.reviewers[p.id], now) : 'done';
            const usable = status === 'done';
            return (
              <li key={p.id} className={usable ? '' : 'is-unusable'}>
                <span className="mlab-avatar" style={{ '--hue': p.hue }}>{p.initials}</span>
                <div>
                  <strong>{p.name}</strong>
                  <p>{usable ? p.teaser : 'Review not finished — nothing to weigh yet.'}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={usable && included.includes(p.id)}
                  disabled={!usable}
                  className={`mlab-switch ${usable && included.includes(p.id) ? 'is-on' : ''}`}
                  onClick={() => toggle(p.id)}
                >
                  <span className="mlab-switch-knob" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mlab-reflect">
          <div className="mlab-reflect-head">
            <label htmlFor="final-instruction">Final instruction to the mentor</label>
            <SavePulse savedAt={savedAt} />
          </div>
          <textarea
            id="final-instruction"
            rows={3}
            placeholder="e.g. Be blunt about pricing. Ignore the competitor's bundling point."
            value={instruction}
            onChange={(e) => onInstruction(e.target.value)}
          />
        </div>

        <button
          className="mlab-btn mlab-btn-primary"
          onClick={() => runStore.startMentor(buildSteps(included))}
        >
          Start mentor synthesis
        </button>
      </div>
    );
  }

  return (
    <div className="mlab-mentor">
      <header className="mlab-room-head">
        <div>
          <p className="mlab-eyebrow">Mentor synthesis</p>
          <h2>{finished ? 'Synthesis complete' : 'Working through your panel…'}</h2>
        </div>
        <SlotSwap stateKey={finished ? 'redo' : 'live'} height={40}>
          {finished ? (
            <button className="mlab-btn mlab-btn-ghost" onClick={() => runStore.startMentor(mentor.steps)}>
              Re-run synthesis
            </button>
          ) : (
            <span className="mlab-tile-elapsed">{Math.floor(elapsed / 1000)}s</span>
          )}
        </SlotSwap>
      </header>

      <ol className="mlab-steps">
        {mentor.steps.map((step, i) => {
          const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
          return (
            <li key={step.label} className={`mlab-step is-${state}`}>
              {state === 'active' && (
                <motion.span className="mlab-step-ind" layoutId="mentor-step-ind" transition={SPRING} />
              )}
              <span className={`mlab-step-icon is-${state}`}>{state === 'done' ? '✓' : ''}</span>
              <span className={`mlab-step-label ${state === 'active' ? 'is-shimmer' : ''}`}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Both output cards exist at full size from first paint; only their
          inner content crossfades when the mentor finishes. Zero CLS. */}
      <div className="mlab-output-grid">
        <article className="mlab-output-card" style={{ height: 300 }}>
          <h3>Pitch Brief</h3>
          <SlotSwap stateKey={finished ? 'content' : 'skeleton'} className="mlab-output-body">
            {finished ? (
              <div>
                <p className="mlab-para">
                  <strong>The wedge:</strong> weeknight decision fatigue, not recipe storage. Every
                  incumbent organizes recipes; nobody owns the Sunday five-minute plan.
                </p>
                <p className="mlab-para">
                  <strong>The honest risk:</strong> the panel converged on retention — novelty carries
                  session one, the iteration loop must carry session two.
                </p>
                <p className="mlab-para">
                  <strong>Next move:</strong> concierge-plan ten households for two weeks before writing
                  more code.
                </p>
              </div>
            ) : (
              <SkeletonLines lines={7} lastWidth="45%" />
            )}
          </SlotSwap>
        </article>

        <article className="mlab-output-card" style={{ height: 300 }}>
          <h3>Revised Evaluation Input</h3>
          <SlotSwap stateKey={finished ? 'content' : 'skeleton'} className="mlab-output-body">
            {finished ? (
              <div className="mlab-revised">
                <textarea
                  rows={7}
                  defaultValue={
                    'A weekly meal-planning service for 2-4 person households that turns saved recipes into one plan and one grocery run. v1 is concierge: a human plans for 10 households; the app only records outcomes. Key question for the next roast: will households still submit preferences in week 3?'
                  }
                />
                <button className="mlab-btn mlab-btn-primary">Re-evaluate this direction →</button>
              </div>
            ) : (
              <div>
                <Skeleton height={148} radius={10} />
                <div style={{ height: 16 }} />
                <Skeleton height={40} width={220} radius={10} />
              </div>
            )}
          </SlotSwap>
        </article>
      </div>
    </div>
  );
}
