import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket/handlers";
// Supabase persistence commented out - using in-memory storage
// import { createBoard } from "./db/boards";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// In-memory board creation (replaces Supabase persistence)
app.post("/boards", (_req, res) => {
  try {
    const id = randomUUID();
    res.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

registerSocketHandlers(io);

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
