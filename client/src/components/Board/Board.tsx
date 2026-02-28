import { useEffect, useState } from "react";
import { Canvas } from "../Canvas/Canvas";
import { Toolbar } from "../Toolbar/Toolbar";
import { UserPresence } from "../UserPresence/UserPresence";
import { NameEditor } from "../NameEditor/NameEditor";
import { useSocket } from "../../hooks/useSocket";
import { useExport } from "../../hooks/useExport";
import { useBoardStore } from "../../stores/boardStore";
import { useRemoteCursors } from "../../hooks/useRemoteCursors";
import { RemoteCursors } from "../RemoteCursors/RemoteCursors";
import { toolKeyMap } from "../../lib/keyboard";
import { useToolStore } from "../../stores/toolStore";
import styles from "./Board.module.css";
import { ExportDialog } from "../ExportDialog/ExportDialog";
import { ToolHints } from "../ToolHints/ToolHints";

type BoardProps = {
  boardId: string;
};

export const Board = ({ boardId }: BoardProps) => {
  const {
    socket,
    emitUndo,
    emitRedo,
    emitRename,
    emitUserUpdate,
    emitPrimitive,
    emitPrimitiveUpdate,
    emitPrimitiveDelete,
    emitCursorMove,
  } = useSocket(boardId);
  const cursors = useRemoteCursors(socket);
  const exportCanvas = useExport();
  const { primitives } = useBoardStore();
  const { setActiveTool } = useToolStore();
  const [ready, setReady] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        if (event.shiftKey) {
          emitRedo();
        } else {
          emitUndo();
        }
        event.preventDefault();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "s") {
        setExportOpen(true);
        event.preventDefault();
        return;
      }

      if (toolKeyMap[key]) {
        setActiveTool(toolKeyMap[key]);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [emitRedo, emitUndo, setActiveTool]);

  if (!ready) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.grain} />
      <Canvas
        onCreatePrimitive={emitPrimitive}
        onUpdatePrimitive={(id, changes) => emitPrimitiveUpdate({ id, changes })}
        onDeletePrimitive={(id) => emitPrimitiveDelete({ id })}
        onCursorMove={(x, y) => emitCursorMove({ x, y })}
        onTransformChange={setTransform}
      />
      <RemoteCursors cursors={cursors} transform={transform} />
      <NameEditor
        onRename={(name) => emitRename({ name })}
        onColorChange={(color) => emitUserUpdate({ color })}
      />
      <UserPresence />
      <ToolHints />
      <Toolbar
        onUndo={emitUndo}
        onRedo={emitRedo}
        onExport={() => setExportOpen(true)}
      />
      <ExportDialog
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(withGrid) => {
          exportCanvas(primitives, withGrid);
          setExportOpen(false);
        }}
      />
    </div>
  );
};
