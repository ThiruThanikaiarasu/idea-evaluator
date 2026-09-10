import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { PERSONAS, PHRASE_MS } from '../personas.js';
import { reviewerStatus } from '../mock/runStore.js';
import { SlotSwap } from '../primitives/SlotSwap.jsx';
import { AnimatedHeight } from '../primitives/AnimatedHeight.jsx';
import { SavePulse } from '../primitives/SavePulse.jsx';
import { SPRING, tState, tExit, tLayout } from '../tokens.js';

const SOUL = [
  ['Audience', 'Weeknight home cooks in 2-4 person households'],
  ['Problem', 'Deciding what to cook is a nightly negotiation'],
  ['Business value', 'Fewer wasted groceries, one shopping trip'],
  ['Revenue model', 'Unpriced — flagged by the panel'],
  ['Key assumption', 'People will plan weekly if planning takes < 5 min'],
  ['Smallest test', 'Concierge-plan 10 households for two weeks'],
];

// Session-local reflections; the real app auto-saves these to SQLite.
const reflections = {};

// Expands from the clicked tile via a shared layoutId, so moving between the
// Review Room and a single review reads as one physical space, not a page cut.
// The card is fixed-size with internal scroll: switching personas inside it
// can never resize or shift the page behind it.
export function PersonaDetail({ openedId, run, now, onClose }) {
  const [activeId, setActiveId] = useState(openedId);
  const persona = PERSONAS.find((p) => p.id === activeId);
  const reviewer = run.reviewers[activeId];
  const status = reviewerStatus(reviewer, now);
  const [showQuestions, setShowQuestions] = useState(false);

  const [text, setText] = useState(reflections[activeId] ?? '');
  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    setText(reflections[activeId] ?? '');
    setShowQuestions(false);
  }, [activeId]);

  const onType = (value) => {
    setText(value);
    reflections[activeId] = value;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedAt(Date.now()), 900);
  };

  const phrase = persona.phrases[Math.floor((now - (reviewer?.startedAt ?? now)) / PHRASE_MS) % persona.phrases.length];

  return (
    <div className="mlab-detail-layer">
      <motion.div
        className="mlab-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: tState }}
        exit={{ opacity: 0, transition: tExit }}
        onClick={onClose}
      />
      <motion.div
        layoutId={`persona-card-${openedId}`}
        className="mlab-detail"
        style={{ '--hue': persona.hue }}
        transition={SPRING}
      >
        <header className="mlab-detail-head">
          <span className="mlab-avatar">{persona.initials}</span>
          <div>
            <h3>{persona.name}</h3>
            <p>{persona.role}</p>
          </div>
          <button className="mlab-btn mlab-btn-ghost" onClick={onClose}>
            ← Room
          </button>
        </header>

        <nav className="mlab-tabs" aria-label="Reviewers">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              className={`mlab-tab ${p.id === activeId ? 'is-active' : ''}`}
              onClick={() => setActiveId(p.id)}
            >
              {p.initials}
              {p.id === activeId && (
                <motion.span className="mlab-tab-ind" layoutId="persona-tab-ind" transition={SPRING} />
              )}
            </button>
          ))}
        </nav>

        <div className="mlab-detail-scroll">
          <section className="mlab-soul">
            <p className="mlab-eyebrow">Shared Idea Soul</p>
            <div className="mlab-soul-grid">
              {SOUL.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <p>{value}</p>
                </div>
              ))}
            </div>
          </section>

          <SlotSwap stateKey={`${activeId}-${status}`} className="mlab-detail-body">
            {status === 'done' ? (
              <div>
                {persona.analysis.map((para) => (
                  <p key={para} className="mlab-para">
                    {para}
                  </p>
                ))}

                <button className="mlab-btn mlab-btn-ghost" onClick={() => setShowQuestions((v) => !v)}>
                  {showQuestions ? 'Hide' : 'Show'} their hard questions
                </button>
                <AnimatedHeight>
                  {showQuestions ? (
                    <ul className="mlab-questions">
                      {persona.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  ) : (
                    <div />
                  )}
                </AnimatedHeight>

                <div className="mlab-reflect">
                  <div className="mlab-reflect-head">
                    <label htmlFor={`reflect-${activeId}`}>Your reflection</label>
                    <SavePulse savedAt={savedAt} />
                  </div>
                  <textarea
                    id={`reflect-${activeId}`}
                    rows={4}
                    placeholder="What lands? What do you push back on?"
                    value={text}
                    onChange={(e) => onType(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="mlab-detail-waiting">
                <em className="mlab-tile-phrase">{status === 'failed' ? 'This review needs a retry — head back to the room.' : `${phrase}…`}</em>
                <div className={`mlab-scanline ${status === 'running' ? 'is-active' : ''}`} aria-hidden="true" />
              </div>
            )}
          </SlotSwap>
        </div>
      </motion.div>
    </div>
  );
}
