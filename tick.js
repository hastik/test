const UPDATE_INTERVAL = 0.2;

export const startTicker = (economy, onUpdate) => {
  let last = performance.now();
  let accumulator = 0;
  const step = (now) => {
    const delta = Math.max(0, now - last) / 1000;
    last = now;
    const rate = economy.productionRate?.() ?? 0;
    if (rate > 0 && delta > 0) economy.add(rate * delta);
    accumulator += delta;
    if (accumulator >= UPDATE_INTERVAL) {
      accumulator = 0;
      onUpdate?.();
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
