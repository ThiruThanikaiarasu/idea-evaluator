import { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { runStore } from './mock/runStore.js';
import { ReviewRoom } from './components/ReviewRoom.jsx';
import { MentorSynthesis } from './components/MentorSynthesis.jsx';
import { IdeaBoard } from './components/IdeaBoard.jsx';
import { SPRING, tLayout, tExit } from './tokens.js';
import './tokens.css';
import './motion-lab.css';

const SCREENS = [
  { id: 'board', label: 'Idea Board' },
  { id: 'room', label: 'Review Room' },
  { id: 'mentor', label: 'Mentor' },
];

export function MotionLab() {
  const [screen, setScreen] = useState('board');

  return (
    <MotionConfig reducedMotion="user">
      <div className="mlab">
        <header className="mlab-topbar">
          <span className="mlab-wordmark">Roast Room · motion lab</span>
          <nav className="mlab-tabs" aria-label="Screens">
            {SCREENS.map((s) => (
              <button
                key={s.id}
                className={`mlab-tab is-text ${screen === s.id ? 'is-active' : ''}`}
                onClick={() => setScreen(s.id)}
              >
                {s.label}
                {screen === s.id && (
                  <motion.span className="mlab-tab-ind" layoutId="nav-ind" transition={SPRING} />
                )}
              </button>
            ))}
          </nav>
          <button className="mlab-btn mlab-btn-ghost" onClick={() => runStore.reset()}>
            Reset demo
          </button>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={screen}
            className="mlab-page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: tLayout }}
            exit={{ opacity: 0, y: -6, transition: tExit }}
          >
            {screen === 'board' && <IdeaBoard onRoast={() => setScreen('room')} />}
            {screen === 'room' && <ReviewRoom onContinue={() => setScreen('mentor')} />}
            {screen === 'mentor' && <MentorSynthesis />}
          </motion.main>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
