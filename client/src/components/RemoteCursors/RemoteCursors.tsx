import { useBoardStore } from "../../stores/boardStore";
import styles from "./RemoteCursors.module.css";

export type CursorMap = Record<string, { x: number; y: number } | undefined>;

type RemoteCursorsProps = {
  cursors: CursorMap;
  transform: { scale: number; offsetX: number; offsetY: number };
};

export const RemoteCursors = ({ cursors, transform }: RemoteCursorsProps) => {
  const { users } = useBoardStore();

  return (
    <div className={styles.layer}>
      {users.map((user) => {
        const cursor = cursors[user.sessionId];
        if (!cursor) return null;
        const screenX = cursor.x * transform.scale + transform.offsetX;
        const screenY = cursor.y * transform.scale + transform.offsetY;
        return (
          <div
            key={user.sessionId}
            className={styles.cursor}
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`
            }}
          >
            <span className={styles.arrow} style={{ color: user.color }}>▲</span>
            <span className={styles.label} style={{ backgroundColor: user.color }}>
              {user.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
