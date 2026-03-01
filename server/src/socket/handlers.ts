import type { Server, Socket } from "socket.io";
import type {
  BoardSyncPayload,
  CursorMovePayload,
  JoinPayload,
  PrimitiveDeletePayload,
  PrimitiveUpdatePayload,
  UserRenamePayload,
  UserUpdatePayload,
} from "../../../shared/types/events";
import type { Primitive } from "../../../shared/types/primitives";
import type { UserPresence } from "../../../shared/types/user";
// Supabase persistence commented out - using in-memory storage
// import { getBoardPrimitives, insertPrimitive, softDeletePrimitive, updatePrimitive } from "../db/primitives";
import { undoManager } from "../undo/manager";
import { SOCKET_EVENTS } from "./events";

type BoardUsers = Map<string, UserPresence>;
const boardUsers = new Map<string, BoardUsers>();

// In-memory storage for primitives (replaces Supabase persistence)
type StoredPrimitive = Primitive & { deleted_at?: string | null };
const boardPrimitives = new Map<string, Map<string, StoredPrimitive>>();

const getPrimitivesForBoard = (boardId: string): Map<string, StoredPrimitive> => {
  if (!boardPrimitives.has(boardId)) {
    boardPrimitives.set(boardId, new Map());
  }
  return boardPrimitives.get(boardId)!;
};

const getUsersForBoard = (boardId: string) => {
  if (!boardUsers.has(boardId)) {
    boardUsers.set(boardId, new Map());
  }
  return boardUsers.get(boardId)!;
};

const getSocketUser = (socket: Socket) => {
  return socket.data.user as UserPresence | undefined;
};

export const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN, (payload: JoinPayload) => {
      const { boardId, user } = payload;
      socket.data.boardId = boardId;
      socket.data.user = user;

      socket.join(boardId);

      const users = getUsersForBoard(boardId);
      users.set(user.sessionId, user);

      // In-memory: get primitives that are not deleted
      const primitivesMap = getPrimitivesForBoard(boardId);
      const primitives = Array.from(primitivesMap.values()).filter(p => !p.deleted_at) as Primitive[];
      const syncPayload: BoardSyncPayload = {
        primitives,
        users: Array.from(users.values()),
      };

      socket.emit(SOCKET_EVENTS.BOARD_SYNC, syncPayload);
      socket.to(boardId).emit(SOCKET_EVENTS.USER_JOINED, user);
    });

    socket.on(SOCKET_EVENTS.PRIMITIVE_CREATE, (primitive: Primitive) => {
      const boardId = socket.data.boardId as string | undefined;
      if (!boardId) return;

      // In-memory: store the primitive
      const primitivesMap = getPrimitivesForBoard(boardId);
      const stored = { ...primitive, deleted_at: null };
      primitivesMap.set(primitive.id, stored);
      
      undoManager.recordCreate(boardId, stored.id);
      io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_CREATED, stored);
    });

    socket.on(SOCKET_EVENTS.PRIMITIVE_UPDATE, (payload: PrimitiveUpdatePayload) => {
      const boardId = socket.data.boardId as string | undefined;
      if (!boardId) return;

      // In-memory: update the primitive
      const primitivesMap = getPrimitivesForBoard(boardId);
      const existing = primitivesMap.get(payload.id);
      if (existing) {
        const before = { ...existing } as Primitive;
        Object.assign(existing, payload.changes);
        const after = { ...existing } as Primitive;
        undoManager.recordUpdate(boardId, payload.id, before, after);
        io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_UPDATED, payload);
      }
    });

    socket.on(SOCKET_EVENTS.PRIMITIVE_DELETE, (payload: PrimitiveDeletePayload) => {
      const boardId = socket.data.boardId as string | undefined;
      if (!boardId) return;

      // In-memory: soft delete the primitive
      const primitivesMap = getPrimitivesForBoard(boardId);
      const existing = primitivesMap.get(payload.id);
      if (existing) {
        const snapshot = { ...existing } as Primitive;
        undoManager.recordDelete(boardId, snapshot);
        existing.deleted_at = new Date().toISOString();
        primitivesMap.set(payload.id, existing);
      }
      io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_DELETED, payload);
    });

    socket.on(SOCKET_EVENTS.CURSOR_MOVE, (payload: CursorMovePayload) => {
      const boardId = socket.data.boardId as string | undefined;
      const user = getSocketUser(socket);
      if (!boardId || !user) return;
      socket.to(boardId).emit(SOCKET_EVENTS.CURSOR_MOVED, {
        sessionId: user.sessionId,
        x: payload.x,
        y: payload.y,
      });
    });

    socket.on(SOCKET_EVENTS.USER_RENAME, (payload: UserRenamePayload) => {
      const boardId = socket.data.boardId as string | undefined;
      const user = getSocketUser(socket);
      if (!boardId || !user) return;

      const users = getUsersForBoard(boardId);
      const updated = { ...user, name: payload.name };
      users.set(user.sessionId, updated);
      socket.data.user = updated;
      io.to(boardId).emit(SOCKET_EVENTS.USER_RENAMED, {
        sessionId: user.sessionId,
        name: payload.name,
      });
    });

    socket.on(SOCKET_EVENTS.USER_UPDATE, (payload: UserUpdatePayload) => {
      const boardId = socket.data.boardId as string | undefined;
      const user = getSocketUser(socket);
      if (!boardId || !user) return;

      const users = getUsersForBoard(boardId);
      const updated = { ...user, ...payload } as UserPresence;
      users.set(user.sessionId, updated);
      socket.data.user = updated;
      io.to(boardId).emit(SOCKET_EVENTS.USER_UPDATED, {
        sessionId: user.sessionId,
        ...payload,
      });
    });

    socket.on(SOCKET_EVENTS.UNDO, () => {
      const boardId = socket.data.boardId as string | undefined;
      if (!boardId) return;

      const action = undoManager.undo(boardId);
      if (!action) return;

      const primitivesMap = getPrimitivesForBoard(boardId);
      if (action.type === "create") {
        const existing = primitivesMap.get(action.id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          primitivesMap.set(action.id, existing);
        }
        io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_DELETED, { id: action.id });
      }

      if (action.type === "delete") {
        const restored = { ...action.snapshot, deleted_at: null } as StoredPrimitive;
        primitivesMap.set(action.snapshot.id, restored);
        io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_CREATED, restored);
      }

      if (action.type === "update") {
        const existing = primitivesMap.get(action.id);
        if (existing) {
          Object.assign(existing, action.before, { deleted_at: existing.deleted_at ?? null });
          primitivesMap.set(action.id, existing);
        } else {
          primitivesMap.set(action.id, { ...action.before, deleted_at: null } as StoredPrimitive);
        }
        io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_UPDATED, {
          id: action.id,
          changes: action.before,
        });
      }
    });

    socket.on(SOCKET_EVENTS.REDO, () => {
      const boardId = socket.data.boardId as string | undefined;
      if (!boardId) return;

      const action = undoManager.redo(boardId);
      if (!action) return;

      const primitivesMap = getPrimitivesForBoard(boardId);
      if (action.type === "create") {
        const existing = primitivesMap.get(action.id);
        if (existing) {
          existing.deleted_at = null;
          primitivesMap.set(action.id, existing);
          io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_CREATED, existing);
        }
      }

      if (action.type === "delete") {
        const existing = primitivesMap.get(action.snapshot.id);
        if (existing) {
          existing.deleted_at = new Date().toISOString();
          primitivesMap.set(action.snapshot.id, existing);
        }
        io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_DELETED, { id: action.snapshot.id });
      }

      if (action.type === "update") {
        const existing = primitivesMap.get(action.id);
        if (existing) {
          Object.assign(existing, action.after, { deleted_at: existing.deleted_at ?? null });
          primitivesMap.set(action.id, existing);
        } else {
          primitivesMap.set(action.id, { ...action.after, deleted_at: null } as StoredPrimitive);
        }
        io.to(boardId).emit(SOCKET_EVENTS.PRIMITIVE_UPDATED, {
          id: action.id,
          changes: action.after,
        });
      }
    });

    socket.on("disconnect", () => {
      const boardId = socket.data.boardId as string | undefined;
      const user = getSocketUser(socket);
      if (!boardId || !user) return;

      const users = getUsersForBoard(boardId);
      users.delete(user.sessionId);
      socket.to(boardId).emit(SOCKET_EVENTS.USER_LEFT, { sessionId: user.sessionId });
    });
  });
};
