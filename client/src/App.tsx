import { useEffect, useState } from "react";
import { Board } from "./components/Board/Board";

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const createBoard = async () => {
  const response = await fetch(`${serverUrl}/boards`, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error ? ` - ${data.error}` : "";
    throw new Error(`Server error: ${response.status}${detail}`);
  }
  if (!data?.id) {
    throw new Error("Invalid response from server");
  }
  return data.id as string;
};

function App() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const keepAlive = () => {
      fetch(`${serverUrl}/health`).catch(() => null);
    };
    keepAlive();
    const interval = window.setInterval(keepAlive, 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const init = async () => {
      const url = new URL(window.location.href);
      const existing = url.pathname.split("/").filter(Boolean)[0];
      if (existing) {
        setBoardId(existing);
        return;
      }

      try {
        const id = await createBoard();
        window.history.replaceState({}, "", `/${id}`);
        setBoardId(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create board";
        setError(message);
      }
    };
    init();
  }, []);

  if (!boardId) {
    return (
      <div style={{ padding: 24, fontFamily: "IBM Plex Sans, sans-serif" }}>
        {error ? (
          <div>
            <h2>Unable to create board</h2>
            <p>{error}</p>
            <p>Check the server at http://localhost:3001 and your Supabase env vars.</p>
          </div>
        ) : (
          <div>Loading board...</div>
        )}
      </div>
    );
  }

  return <Board boardId={boardId} />;
}

export default App;
