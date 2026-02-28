import { useBoardStore } from "../../stores/boardStore";
import styles from "./UserPresence.module.css";

export const UserPresence = () => {
  const { users } = useBoardStore();

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Studio Presence</h3>
      {users.map((user) => (
        <div key={user.sessionId} className={styles.item}>
          <span className={styles.dot} style={{ backgroundColor: user.color }} />
          <span>{user.name}</span>
        </div>
      ))}
    </div>
  );
};
