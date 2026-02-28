import { create } from "zustand";
import type { UserPresence } from "shared/user";
import { getSessionId } from "../lib/sessionId";
import { generateName } from "../lib/nameGenerator";
import { pickUserColor } from "../lib/colors";

type UserState = {
  sessionId: string;
  name: string;
  color: string;
  setName: (name: string) => void;
  setColor: (color: string) => void;
  setUser: (user: UserPresence) => void;
};

const sessionId = getSessionId();
const storedName = localStorage.getItem("studio-board-name");
const storedColor = localStorage.getItem("studio-board-color");
const defaultName = storedName || generateName();
const defaultColor = storedColor || pickUserColor(sessionId);

export const useUserStore = create<UserState>((set) => ({
  sessionId,
  name: defaultName,
  color: defaultColor,
  setName: (name) => {
    localStorage.setItem("studio-board-name", name);
    set({ name });
  },
  setColor: (color) => {
    localStorage.setItem("studio-board-color", color);
    set({ color });
  },
  setUser: (user) => {
    localStorage.setItem("studio-board-name", user.name);
    localStorage.setItem("studio-board-color", user.color);
    set({
      sessionId: user.sessionId,
      name: user.name,
      color: user.color,
    });
  },
}));
