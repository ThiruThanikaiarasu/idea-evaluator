// JS mirror of tokens.css for the motion/react components.
// Keep the two files in sync by hand — they are the entire motion vocabulary.

export const DUR = { micro: 0.12, state: 0.25, layout: 0.4 };

export const EASE = {
  out: [0.22, 1, 0.36, 1], // entrances & most feedback
  inOut: [0.65, 0, 0.35, 1], // moves and size changes
  in: [0.5, 0, 0.75, 0], // exits only
};

// One spring, used for anything that should feel physical
// (progress bar, shared-element moves, sliding indicators).
export const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 };

export const STAGGER = {
  tiles: 0.09, // persona tiles entering the Review Room
  list: 0.05, // list rows (idea board, history)
};

export const tMicro = { duration: DUR.micro, ease: EASE.out };
export const tState = { duration: DUR.state, ease: EASE.out };
export const tExit = { duration: DUR.state, ease: EASE.in };
export const tLayout = { duration: DUR.layout, ease: EASE.inOut };
