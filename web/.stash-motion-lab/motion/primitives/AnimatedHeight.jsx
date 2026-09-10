import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { tLayout } from '../tokens.js';

// Animates its own height to match its content whenever the content resizes,
// so variable-length agent output grows/shrinks smoothly instead of snapping.
export function AnimatedHeight({ children, className = '' }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      className={className}
      style={{ overflow: 'hidden' }}
      initial={false}
      animate={height != null ? { height } : undefined}
      transition={tLayout}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}
