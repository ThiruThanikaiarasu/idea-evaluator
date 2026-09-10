import { STAGGER, tState } from '../tokens.js';

// Shared variants for staggered list/grid entrances. Parent gets
// `variants={staggerParent()}` + initial="hidden" animate="show";
// each child gets `variants={staggerChild}`.
export const staggerParent = (step = STAGGER.list, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren } },
});

export const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: tState },
};
