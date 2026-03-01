import http from "http";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket/handlers";
// Supabase persistence commented out - using in-memory storage
// import { createBoard } from "./db/boards";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".png";
    const name = randomUUID();
    cb(null, `${name}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

app.post("/uploads", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && typeof err === "object" && "message" in err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }
  next(err);
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
