export function makeTimer(onTick) {
  let startMs = 0;
  let elapsedMs = 0;
  let t = null;

  function now() { return Date.now(); }

  function start() {
    if (t) return;
    startMs = now();
    t = setInterval(() => {
      const total = elapsedMs + (now() - startMs);
      onTick?.(Math.floor(total / 1000));
    }, 250);
  }

  function pause() {
    if (!t) return;
    clearInterval(t);
    t = null;
    elapsedMs += (now() - startMs);
  }

  function reset() {
    if (t) { clearInterval(t); t = null; }
    startMs = 0;
    elapsedMs = 0;
    onTick?.(0);
  }

  function seconds() {
    const total = elapsedMs + (t ? (now() - startMs) : 0);
    return Math.floor(total / 1000);
  }

  return { start, pause, reset, seconds };
}

export function formatMMSS(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}
