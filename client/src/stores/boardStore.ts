import { create } from "zustand";
import type { Primitive } from "shared/primitives";
import type { UserPresence } from "shared/user";

type BoardState = {
  primitives: Primitive[];
  users: UserPresence[];
  setPrimitives: (primitives: Primitive[]) => void;
  addPrimitive: (primitive: Primitive) => void;
  updatePrimitive: (id: string, changes: Partial<Primitive>) => void;
  removePrimitive: (id: string) => void;
  setUsers: (users: UserPresence[]) => void;
  upsertUser: (user: UserPresence) => void;
  removeUser: (sessionId: string) => void;
};

export const useBoardStore = create<BoardState>((set) => ({
  primitives: [],
  users: [],
  setPrimitives: (primitives) => set({ primitives }),
  addPrimitive: (primitive) =>
    set((state) => {
      const exists = state.primitives.some((item) => item.id === primitive.id);
      if (exists) {
        return state;
      }
      return { primitives: [...state.primitives, primitive] };
    }),
  updatePrimitive: (id, changes) =>
    set((state) => ({
      primitives: state.primitives.map((primitive) =>
        primitive.id === id ? ({ ...primitive, ...changes } as Primitive) : primitive
      ),
    })),
  removePrimitive: (id) =>
    set((state) => ({
      primitives: state.primitives.filter((primitive) => primitive.id !== id),
    })),
  setUsers: (users) => set({ users }),
  upsertUser: (user) =>
    set((state) => {
      const existing = state.users.find((item) => item.sessionId === user.sessionId);
      if (existing) {
        return {
          users: state.users.map((item) =>
            item.sessionId === user.sessionId ? user : item
          ),
        };
      }
      return { users: [...state.users, user] };
    }),
  removeUser: (sessionId) =>
    set((state) => ({
      users: state.users.filter((user) => user.sessionId !== sessionId),
    })),
}));
