import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Skeleton } from '../primitives/Skeleton.jsx';
import { SavePulse } from '../primitives/SavePulse.jsx';
import { staggerParent, staggerChild } from '../primitives/stagger.js';
import { SlotSwap } from '../primitives/SlotSwap.jsx';
import { tState, tExit, SPRING } from '../tokens.js';

// The non-loading proof: the same motion language applied to an ordinary
// screen. Skeleton rows at the real row height, staggered entry, layout-
// animated insertion, hover/press micro-transitions, save pulse.

const SEED = [
  { id: 1, title: 'Recipe box that plans your week', story: 'Turn saved recipes into a weekly plan and one grocery run.', iterations: 1 },
  { id: 2, title: 'Roast my side project', story: 'Four AI personas tear an idea apart before you build it.', iterations: 3 },
  { id: 3, title: 'Standup summarizer', story: 'Slack thread in, three bullet points out, nobody talks for 15 minutes.', iterations: 2 },
  { id: 4, title: 'Plant-death predictor', story: 'Camera + watering log predicts which houseplant dies next.', iterations: 1 },
];

const ROW_HEIGHT = 92;

// Module-level cache: the skeleton pass runs only on first visit; navigating
// back renders instantly with no re-loading theater.
let ideasCache = null;

export function IdeaBoard({ onRoast }) {
  const [ideas, setIdeas] = useState(ideasCache);
  const [title, setTitle] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (ideasCache) return;
    const t = setTimeout(() => {
      ideasCache = SEED;
      setIdeas(SEED);
    }, 1100); // mock SQLite fetch
    return () => clearTimeout(t);
  }, []);

  const addIdea = () => {
    if (!title.trim()) return;
    const idea = { id: Date.now(), title: title.trim(), story: 'New idea — add the story before roasting.', iterations: 0 };
    ideasCache = [idea, ...ideasCache];
    setIdeas(ideasCache);
    setTitle('');
    setSavedAt(Date.now()); // instant SQLite save in the real app
  };

  return (
    <div className="mlab-board">
      <header className="mlab-room-head">
        <div>
          <p className="mlab-eyebrow">Idea Board</p>
          <h2>Your ideas</h2>
        </div>
      </header>

      <div className="mlab-composer">
        <input
          type="text"
          placeholder="Name a new idea…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addIdea()}
        />
        <button className="mlab-btn mlab-btn-primary" onClick={addIdea}>
          Add idea
        </button>
        <SavePulse savedAt={savedAt} />
      </div>

      {!ideas ? (
        // Skeleton count = expected row count (last-known count in a real app).
        // Rows are the exact final height, so the swap is zero-CLS.
        <div className="mlab-idea-list">
          {SEED.map((s) => (
            <Skeleton key={s.id} height={ROW_HEIGHT} radius={14} />
          ))}
        </div>
      ) : (
        <motion.ul className="mlab-idea-list" variants={staggerParent()} initial="hidden" animate="show">
          <AnimatePresence initial={false}>
            {ideas.map((idea) => (
              <motion.li
                key={idea.id}
                layout
                variants={staggerChild}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1, transition: tState }}
                exit={{ opacity: 0, scale: 0.97, transition: tExit }}
                transition={SPRING}
                className="mlab-idea-row"
                style={{ height: ROW_HEIGHT }}
              >
                <div className="mlab-idea-text">
                  <strong>{idea.title}</strong>
                  <p>{idea.story}</p>
                </div>
                <SlotSwap stateKey={idea.iterations} height={22} className="mlab-idea-meta">
                  <span>
                    {idea.iterations === 0 ? 'not roasted yet' : `${idea.iterations} iteration${idea.iterations > 1 ? 's' : ''}`}
                  </span>
                </SlotSwap>
                <button className="mlab-btn mlab-btn-ghost" onClick={onRoast}>
                  Roast →
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
