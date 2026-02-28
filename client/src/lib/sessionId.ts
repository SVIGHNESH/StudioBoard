const SESSION_KEY = "studio-board-session";

// Fallback UUID generator for insecure contexts (HTTP over IP)
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback using crypto.getRandomValues (works on insecure origins)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === "x" ? 0 : 3);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const getSessionId = () => {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id = generateUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
};
