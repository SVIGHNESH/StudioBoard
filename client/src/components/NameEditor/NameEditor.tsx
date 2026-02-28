import { useState } from "react";
import { useUserStore } from "../../stores/userStore";
import { userColors } from "../../lib/colors";
import styles from "./NameEditor.module.css";

type NameEditorProps = {
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
};

export const NameEditor = ({ onRename, onColorChange }: NameEditorProps) => {
  const { name, color, setName, setColor } = useUserStore();
  const [value, setValue] = useState(name);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setValue(name);
      return;
    }
    setName(trimmed);
    onRename(trimmed);
  };

  const handleColor = (nextColor: string) => {
    setColor(nextColor);
    onColorChange(nextColor);
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>You are</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
      />
      <div className={styles.colors}>
        {userColors.map((chip) => (
          <button
            key={chip}
            className={styles.color}
            style={{ backgroundColor: chip }}
            data-active={chip === color}
            onClick={() => handleColor(chip)}
            aria-label={`Pick ${chip}`}
          />
        ))}
      </div>
    </div>
  );
};
