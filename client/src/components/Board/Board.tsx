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
import { useUserStore } from "../../stores/userStore";
import { uploadImage } from "../../lib/imageUpload";
import type { Primitive } from "shared/primitives";
import { createId } from "../../lib/uuid";
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

  const insertImagePrimitive = (payload: { url: string; width: number; height: number; x: number; y: number }) => {
    const maxWidth = 800;
    const scale = payload.width > maxWidth ? maxWidth / payload.width : 1;
    const primitive: Primitive = {
      id: createId(),
      type: "image",
      x: payload.x,
      y: payload.y,
      width: payload.width * scale,
      height: payload.height * scale,
      src: payload.url,
      rotation: 0,
      createdBy: useUserStore.getState().sessionId,
    };
    emitPrimitive(primitive);
  };

  const handleUploadImage = async (file: File, dropPoint?: { x: number; y: number }) => {
    try {
      setUploadError(null);
      const result = await uploadImage(file, serverUrl);
      const point = dropPoint ?? { x: 120, y: 120 };
      insertImagePrimitive({ url: result.url, width: result.width, height: result.height, x: point.x, y: point.y });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload image";
      setUploadError(message);
    }
  };

  const toCanvasPoint = (clientX: number, clientY: number) => {
    return {
      x: (clientX - transform.offsetX) / transform.scale,
      y: (clientY - transform.offsetY) / transform.scale,
    };
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (!file) return;
    const point = toCanvasPoint(event.clientX, event.clientY);
    handleUploadImage(file, point);
  };

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
    <div
      className={styles.root}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
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
        onUploadImage={(file) => handleUploadImage(file)}
      />
      {uploadError && <div className={styles.uploadError}>{uploadError}</div>}
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
