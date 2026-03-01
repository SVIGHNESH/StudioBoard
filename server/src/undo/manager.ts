import type { Primitive } from "../../../shared/types/primitives";

type HistoryAction =
  | { type: "create"; id: string }
  | { type: "delete"; snapshot: Primitive }
  | { type: "update"; id: string; before: Primitive; after: Primitive };

class UndoManager {
  private undoStacks = new Map<string, HistoryAction[]>();
  private redoStacks = new Map<string, HistoryAction[]>();

  private getStack(map: Map<string, HistoryAction[]>, boardId: string) {
    if (!map.has(boardId)) {
      map.set(boardId, []);
    }
    return map.get(boardId)!;
  }

  record(action: HistoryAction, boardId: string) {
    const undoStack = this.getStack(this.undoStacks, boardId);
    const redoStack = this.getStack(this.redoStacks, boardId);
    undoStack.push(action);
    redoStack.length = 0;
  }

  recordCreate(boardId: string, primitiveId: string) {
    this.record({ type: "create", id: primitiveId }, boardId);
  }

  recordDelete(boardId: string, snapshot: Primitive) {
    this.record({ type: "delete", snapshot }, boardId);
  }

  recordUpdate(boardId: string, id: string, before: Primitive, after: Primitive) {
    this.record({ type: "update", id, before, after }, boardId);
  }

  undo(boardId: string) {
    const undoStack = this.getStack(this.undoStacks, boardId);
    const redoStack = this.getStack(this.redoStacks, boardId);
    const action = undoStack.pop();
    if (!action) return null;
    redoStack.push(action);
    return action;
  }

  redo(boardId: string) {
    const undoStack = this.getStack(this.undoStacks, boardId);
    const redoStack = this.getStack(this.redoStacks, boardId);
    const action = redoStack.pop();
    if (!action) return null;
    undoStack.push(action);
    return action;
  }
}

export const undoManager = new UndoManager();
