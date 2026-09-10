import { useEffect, useState } from 'react';

// Shared clock for time-derived UI (phrase cycling, elapsed counters,
// step progress). Deriving from a ticking `now` — instead of storing
// animation progress in state — is what makes resume-mid-run free.
export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
