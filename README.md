# Studio Board

Real-time collaborative whiteboard with live cursors, global undo/redo, and image upload + annotation.

## Project Structure

```
client/   React + Vite frontend
server/   Express + Socket.IO backend
shared/   Shared TypeScript types
uploads/  Uploaded images (local disk)
```

## Quick Start

1. Copy `.env.example` to `.env` and set your server URL.

```
VITE_SERVER_URL=http://localhost:3001
```

## Install

```
npm --prefix server install
npm --prefix client install
npm --prefix shared install
```

## Run

```
npm run dev
```

Server runs at `http://localhost:3001`, client at `http://localhost:5173`.

## Build

```
npm run build
```

## Architecture

- Client (Vite + React) renders the canvas, handles tools, and manages local state.
- Server (Express + Socket.IO) syncs primitives, cursors, and global undo/redo.
- Shared package provides TypeScript types for primitives and socket payloads.
- Uploads are stored on the server disk and served from `/uploads`.

## Functionality

- Real-time multi-user drawing with live cursors and presence.
- Tools: select, pen, line, rect, ellipse, arrow, text.
- Global undo/redo across all users.
- Image upload (button or drag/drop) with resize/rotate/select support.
- Export board to PNG with optional grid.

## Notes

- Images are uploaded to `server/uploads` and served from `/uploads`.
- Client-side uploads are downscaled to stay under 1MB (PNG preserved only when transparency exists).
- Data is in-memory on the server for primitives and presence.
