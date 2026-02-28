type StackMap = Map<string, string[]>;

class UndoManager {
  private undoStacks = new Map<string, StackMap>();
  private redoStacks = new Map<string, StackMap>();

  private getStack(map: Map<string, StackMap>, boardId: string, sessionId: string) {
    if (!map.has(boardId)) {
      map.set(boardId, new Map());
    }
    const boardMap = map.get(boardId)!;
    if (!boardMap.has(sessionId)) {
      boardMap.set(sessionId, []);
    }
    return boardMap.get(sessionId)!;
  }

  recordCreate(boardId: string, sessionId: string, primitiveId: string) {
    const undoStack = this.getStack(this.undoStacks, boardId, sessionId);
    const redoStack = this.getStack(this.redoStacks, boardId, sessionId);
    undoStack.push(primitiveId);
    redoStack.length = 0;
  }

  undo(boardId: string, sessionId: string) {
    const undoStack = this.getStack(this.undoStacks, boardId, sessionId);
    const redoStack = this.getStack(this.redoStacks, boardId, sessionId);
    const primitiveId = undoStack.pop();
    if (!primitiveId) return null;
    redoStack.push(primitiveId);
    return primitiveId;
  }

  redo(boardId: string, sessionId: string) {
    const undoStack = this.getStack(this.undoStacks, boardId, sessionId);
    const redoStack = this.getStack(this.redoStacks, boardId, sessionId);
    const primitiveId = redoStack.pop();
    if (!primitiveId) return null;
    undoStack.push(primitiveId);
    return primitiveId;
  }
}

export const undoManager = new UndoManager();
