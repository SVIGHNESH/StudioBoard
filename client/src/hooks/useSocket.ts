import { useEffect, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import type {
  BoardSyncPayload,
  CursorMovePayload,
  PrimitiveDeletePayload,
  PrimitiveUpdatePayload,
  UserRenamePayload,
  UserUpdatePayload,
} from "shared/events";
import type { Primitive } from "shared/primitives";
import type { UserPresence } from "shared/user";
import { useBoardStore } from "../stores/boardStore";
import { useUserStore } from "../stores/userStore";
import { SOCKET_EVENTS } from "../lib/constants";

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const useSocket = (boardId: string) => {
  const { setPrimitives, addPrimitive, updatePrimitive, removePrimitive, setUsers, upsertUser, removeUser } =
    useBoardStore();
  const { sessionId, name, color } = useUserStore();

  const socket: Socket = useMemo(() => io(serverUrl, { autoConnect: false }), []);

  useEffect(() => {
    socket.connect();
    socket.emit(SOCKET_EVENTS.JOIN, {
      boardId,
      user: { sessionId, name, color },
    });

    socket.on(SOCKET_EVENTS.BOARD_SYNC, (payload: BoardSyncPayload) => {
      setPrimitives(payload.primitives);
      setUsers(payload.users);
    });

    socket.on(SOCKET_EVENTS.PRIMITIVE_CREATED, (primitive: Primitive) => {
      addPrimitive(primitive);
    });

    socket.on(SOCKET_EVENTS.PRIMITIVE_UPDATED, (payload: PrimitiveUpdatePayload) => {
      updatePrimitive(payload.id, payload.changes);
    });

    socket.on(SOCKET_EVENTS.PRIMITIVE_DELETED, (payload: PrimitiveDeletePayload) => {
      removePrimitive(payload.id);
    });

    socket.on(SOCKET_EVENTS.USER_JOINED, (user: UserPresence) => {
      upsertUser(user);
    });

    socket.on(SOCKET_EVENTS.USER_RENAMED, (payload: { sessionId: string; name: string }) => {
      const existing = useBoardStore.getState().users.find((u) => u.sessionId === payload.sessionId);
      if (!existing) return;
      upsertUser({ ...existing, name: payload.name });
    });

    socket.on(SOCKET_EVENTS.USER_UPDATED, (payload: { sessionId: string; name?: string; color?: string }) => {
      const existing = useBoardStore.getState().users.find((u) => u.sessionId === payload.sessionId);
      if (!existing) return;
      upsertUser({ ...existing, ...payload });
    });

    socket.on(SOCKET_EVENTS.USER_LEFT, (payload: { sessionId: string }) => {
      removeUser(payload.sessionId);
    });

    return () => {
      socket.disconnect();
    };
  }, [boardId, sessionId, name, color, socket, setPrimitives, addPrimitive, updatePrimitive, removePrimitive, setUsers, upsertUser, removeUser]);

  const emitPrimitive = (primitive: Primitive) => {
    socket.emit(SOCKET_EVENTS.PRIMITIVE_CREATE, primitive);
  };

  const emitPrimitiveUpdate = (payload: PrimitiveUpdatePayload) => {
    socket.emit(SOCKET_EVENTS.PRIMITIVE_UPDATE, payload);
  };

  const emitPrimitiveDelete = (payload: PrimitiveDeletePayload) => {
    socket.emit(SOCKET_EVENTS.PRIMITIVE_DELETE, payload);
  };

  const emitCursorMove = (payload: CursorMovePayload) => {
    socket.emit(SOCKET_EVENTS.CURSOR_MOVE, payload);
  };

  const emitRename = (payload: UserRenamePayload) => {
    socket.emit(SOCKET_EVENTS.USER_RENAME, payload);
  };

  const emitUserUpdate = (payload: UserUpdatePayload) => {
    socket.emit(SOCKET_EVENTS.USER_UPDATE, payload);
  };

  const emitUndo = () => socket.emit(SOCKET_EVENTS.UNDO);
  const emitRedo = () => socket.emit(SOCKET_EVENTS.REDO);

  return {
    socket,
    emitPrimitive,
    emitPrimitiveUpdate,
    emitPrimitiveDelete,
    emitCursorMove,
    emitRename,
    emitUserUpdate,
    emitUndo,
    emitRedo,
  };
};
