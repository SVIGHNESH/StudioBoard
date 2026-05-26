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

## Motivation

Studio Board was built to explore what it takes to make real-time collaboration feel instant. Most whiteboard tools either feel laggy under multi-user load or hide their sync model behind a heavy framework — this project is an attempt to build a lean, transparent stack (Socket.IO + a shared primitive model + global undo/redo) where the collaboration mechanics are easy to read, easy to extend, and fast enough to be genuinely useful for brainstorming, teaching, and remote design reviews.

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

## Usage

1. Start the app with `npm run dev` and open `http://localhost:5173` in your browser.
2. Share the URL with collaborators — every connected client joins the same board and sees live cursors and presence in real time.
3. Pick a tool from the toolbar:
   - **Select** — click to select, drag to move, use handles to resize/rotate.
   - **Pen** — freehand draw.
   - **Line / Arrow / Rect / Ellipse** — click and drag to create.
   - **Text** — click to place a text box and type.
4. Add images via the upload button or by drag-and-dropping a file onto the canvas. Images are downscaled client-side to stay under 1MB.
5. Use **Undo/Redo** (or `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z`) — history is global, so undo affects the latest action across all users.
6. Export the board to PNG from the toolbar; toggle the grid before exporting if you want it baked into the image.

## Contributing

Contributions are welcome. Studio Board has three workspaces (`client`, `server`, `shared`) and changes often touch more than one — please keep them in sync.

1. Fork the repo and create a feature branch off `main` (`feat/<short-name>` or `fix/<short-name>`).
2. Install all workspaces (`npm --prefix client install && npm --prefix server install && npm --prefix shared install`) and verify `npm run dev` brings up both client and server cleanly.
3. If you add or change a primitive, tool, or socket event:
   - Update the types in `shared/` first so client and server stay aligned.
   - Emit and handle events on both sides; preserve the global undo/redo contract.
4. Test multi-user behavior with at least two browser windows — verify live cursors, presence, and undo/redo across clients before opening a PR.
5. For image upload changes, confirm the 1MB downscale path and that uploads still serve correctly from `/uploads`.
6. Run `npm run build` in each workspace and make sure there are no type errors.
7. Open a PR describing the change, the tools/events affected, and how you tested it. Screenshots or short clips help for canvas-visible changes.

Please avoid committing `server/uploads/` contents, local `.env` files, or build output.

## Notes

- Images are uploaded to `server/uploads` and served from `/uploads`.
- Client-side uploads are downscaled to stay under 1MB (PNG preserved only when transparency exists).
- Data is in-memory on the server for primitives and presence.
