import { AnimatePresence, motion } from 'motion/react';
import { tState, tExit } from '../tokens.js';

// A fixed-dimension slot whose content crossfades whenever `stateKey` changes.
// The slot itself never resizes, so skeleton → content (or phrase → phrase)
// swaps are zero-CLS by construction. Use this for anything replaced by
// async output.
export function SlotSwap({ stateKey, height, className = '', children }) {
  return (
    <div className={`mlab-slot ${className}`} style={height != null ? { height } : undefined}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={stateKey}
          className="mlab-slot-inner"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0, transition: tState }}
          exit={{ opacity: 0, y: -5, transition: tExit }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
