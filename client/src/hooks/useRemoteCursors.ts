import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "../lib/constants";

type CursorMap = Record<string, { x: number; y: number } | undefined>;

export const useRemoteCursors = (socket: Socket) => {
  const [cursors, setCursors] = useState<CursorMap>({});

  useEffect(() => {
    const handleMove = (payload: { sessionId: string; x: number; y: number }) => {
      setCursors((prev) => ({
        ...prev,
        [payload.sessionId]: { x: payload.x, y: payload.y },
      }));
    };

    const handleLeft = (payload: { sessionId: string }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[payload.sessionId];
        return next;
      });
    };

    socket.on(SOCKET_EVENTS.CURSOR_MOVED, handleMove);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleLeft);

    return () => {
      socket.off(SOCKET_EVENTS.CURSOR_MOVED, handleMove);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleLeft);
    };
  }, [socket]);

  return cursors;
};
