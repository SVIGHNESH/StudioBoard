import type { Primitive } from "./primitives";
import type { UserPresence } from "./user";

export type JoinPayload = {
  boardId: string;
  user: UserPresence;
};

export type BoardSyncPayload = {
  primitives: Primitive[];
  users: UserPresence[];
};

export type PrimitiveUpdatePayload = {
  id: string;
  changes: Partial<Primitive>;
  sessionId?: string;
};

export type PrimitiveDeletePayload = {
  id: string;
};

export type CursorMovePayload = {
  x: number;
  y: number;
};

export type UserRenamePayload = {
  name: string;
};

export type UserUpdatePayload = {
  name?: string;
  color?: string;
};
