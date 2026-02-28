import styles from "./ExportDialog.module.css";

type ExportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (withGrid: boolean) => void;
};

export const ExportDialog = ({ isOpen, onClose, onConfirm }: ExportDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3>Export Board</h3>
        <p>Choose whether to include the grid in the export.</p>
        <div className={styles.actions}>
          <button onClick={() => onConfirm(false)}>Without grid</button>
          <button onClick={() => onConfirm(true)}>With grid</button>
          <button className={styles.ghost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
