import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { tMicro } from '../tokens.js';

// Unobtrusive "Saved" confirmation. Always occupies its slot (fixed width via
// CSS), fading in/out in place — never a toast, never a layout shift.
// Pass a new `savedAt` timestamp each time a save completes.
export function SavePulse({ savedAt, label = 'Saved' }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!savedAt) return;
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer.current);
  }, [savedAt]);

  return (
    <span className="mlab-savepulse" aria-live="polite">
      <motion.span
        className="mlab-savepulse-chip"
        initial={false}
        animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.92 }}
        transition={tMicro}
      >
        ✓ {label}
      </motion.span>
    </span>
  );
}
