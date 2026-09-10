import { motion } from 'motion/react';
import { PHRASE_MS } from '../personas.js';
import { reviewerStatus } from '../mock/runStore.js';
import { SlotSwap } from '../primitives/SlotSwap.jsx';
import { staggerChild } from '../primitives/stagger.js';

// Fixed-height tile with three fixed-height zones (status / scanline /
// footer), so running → done → failed swaps never move a pixel of layout —
// in this tile or its neighbors.
export function PersonaTile({ persona, index, reviewer, now, onOpen, onRetry }) {
  const status = reviewerStatus(reviewer, now);
  const elapsed = now - (reviewer?.startedAt ?? now);
  // Per-tile phase offset so the four tiles read as independent processes,
  // not one synced loop.
  const phrase = persona.phrases[Math.floor((elapsed + index * 1100) / PHRASE_MS) % persona.phrases.length];

  const statusContent = {
    running: <em className="mlab-tile-phrase">{phrase}…</em>,
    done: <p className="mlab-tile-teaser">{persona.teaser}</p>,
    failed: <p className="mlab-tile-teaser is-error">Lost the thread mid-review. The other reviewers are unaffected.</p>,
  }[status];

  const footerContent = {
    running: (
      <span className="mlab-tile-elapsed">
        Reviewing · {Math.max(0, Math.floor(elapsed / 1000))}s
        {reviewer?.attempt > 1 ? ' · retry' : ''}
      </span>
    ),
    done: (
      <button className="mlab-btn mlab-btn-ghost" onClick={() => onOpen(persona.id)}>
        Open review →
      </button>
    ),
    failed: (
      <button className="mlab-btn mlab-btn-danger" onClick={() => onRetry(persona.id)}>
        Retry this reviewer
      </button>
    ),
  }[status];

  return (
    <motion.article
      layoutId={`persona-card-${persona.id}`}
      className={`mlab-tile is-${status}`}
      style={{ '--hue': persona.hue, '--breathe-delay': `${index * 140}ms` }}
      variants={staggerChild}
    >
      <header className="mlab-tile-head">
        <span className="mlab-avatar">{persona.initials}</span>
        <div>
          <h3>{persona.name}</h3>
          <p>{persona.role}</p>
        </div>
        <span className={`mlab-tile-badge is-${status}`} aria-label={status}>
          {status === 'done' ? '✓' : status === 'failed' ? '!' : ''}
        </span>
      </header>

      <SlotSwap className="mlab-tile-status" height={52} stateKey={status === 'running' ? `p-${phrase}` : status}>
        {statusContent}
      </SlotSwap>

      {/* Scanline slot is always reserved; only its opacity changes. */}
      <div className={`mlab-scanline ${status === 'running' ? 'is-active' : ''}`} aria-hidden="true" />

      <SlotSwap className="mlab-tile-foot" height={40} stateKey={status}>
        {footerContent}
      </SlotSwap>
    </motion.article>
  );
}
