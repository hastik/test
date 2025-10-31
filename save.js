const STORAGE_KEY = "idle-foundry-save";
const SAVE_INTERVAL = 30_000;

export const loadSave = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to load save:", error);
    return null;
  }
};

export const writeSave = (snapshot) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...snapshot, time: Date.now() })
    );
  } catch (error) {
    console.warn("Failed to write save:", error);
  }
};

export const setupAutoSave = (getSnapshot) => {
  const persist = () => {
    const snapshot = getSnapshot?.();
    if (snapshot) writeSave(snapshot);
  };
  const id = setInterval(persist, SAVE_INTERVAL);
  window.addEventListener("beforeunload", persist, { passive: true });
  return () => clearInterval(id);
};
