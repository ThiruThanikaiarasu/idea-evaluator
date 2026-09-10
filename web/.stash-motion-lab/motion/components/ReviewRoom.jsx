import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PERSONAS } from '../personas.js';
import { runStore, useRun, reviewerStatus } from '../mock/runStore.js';
import { useNow } from '../mock/useTicker.js';
import { SlotSwap } from '../primitives/SlotSwap.jsx';
import { staggerParent, staggerChild } from '../primitives/stagger.js';
import { SPRING, STAGGER } from '../tokens.js';
import { PersonaTile } from './PersonaTile.jsx';
import { PersonaDetail } from './PersonaDetail.jsx';

export function ReviewRoom({ onContinue }) {
  const run = useRun();
  const now = useNow(250);
  const [openId, setOpenId] = useState(null);

  const statuses = PERSONAS.map((p) => reviewerStatus(run?.reviewers?.[p.id], now));
  const doneCount = statuses.filter((s) => s === 'done').length;
  const settled = statuses.every((s) => s !== 'running');

  if (!run) {
    return (
      <div className="mlab-hero">
        <p className="mlab-eyebrow">Iteration 1</p>
        <h2>“Recipe box that plans your week”</h2>
        <p className="mlab-hero-story">
          An app that turns saved recipes into a weekly plan and a single grocery run, so deciding
          what to cook stops being a nightly negotiation.
        </p>
        <button className="mlab-btn mlab-btn-primary" onClick={() => runStore.startRun()}>
          Start the roast
        </button>
        <p className="mlab-hint">Four reviewers run in parallel. One is scripted to fail so you can see the retry language.</p>
      </div>
    );
  }

  return (
    <div className="mlab-room">
      <header className="mlab-room-head">
        <div>
          <p className="mlab-eyebrow">Review Room · Iteration 1</p>
          <h2>“Recipe box that plans your week”</h2>
        </div>
        <div className="mlab-progress">
          <SlotSwap stateKey={doneCount} height={20} className="mlab-progress-count">
            <span>
              <strong>{doneCount}</strong> of {PERSONAS.length} done
            </span>
          </SlotSwap>
          <div className="mlab-progress-track">
            <motion.div
              className="mlab-progress-bar"
              style={{ originX: 0 }}
              initial={false}
              animate={{ scaleX: doneCount / PERSONAS.length }}
              transition={SPRING}
            />
          </div>
        </div>
      </header>

      <motion.div
        className="mlab-tile-grid"
        variants={staggerParent(STAGGER.tiles)}
        initial="hidden"
        animate="show"
      >
        {PERSONAS.map((p, i) => (
          <PersonaTile
            key={p.id}
            persona={p}
            index={i}
            reviewer={run.reviewers[p.id]}
            now={now}
            onOpen={setOpenId}
            onRetry={(id) => runStore.retry(id)}
          />
        ))}
      </motion.div>

      {/* CTA slot is reserved from first paint; only its content fades in. */}
      <SlotSwap stateKey={settled ? 'ready' : 'waiting'} height={56} className="mlab-room-cta">
        {settled ? (
          <button className="mlab-btn mlab-btn-primary" onClick={onContinue}>
            Continue to panel summary →
          </button>
        ) : (
          <span className="mlab-hint">Reload the page mid-run — finished tiles stay finished, running ones resume.</span>
        )}
      </SlotSwap>

      <AnimatePresence>
        {openId && (
          <PersonaDetail
            openedId={openId}
            run={run}
            now={now}
            onClose={() => setOpenId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
