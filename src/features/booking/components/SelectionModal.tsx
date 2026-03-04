import { Modal, Pressable, StyleSheet, Text } from "react-native";

type SelectionModalOption = {
  key: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

type SelectionModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: SelectionModalOption[];
};

export function SelectionModal({ visible, title, onClose, options }: SelectionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.modalOption, option.selected ? styles.modalOptionSelected : null]}
              onPress={option.onPress}
            >
              <Text style={[styles.modalOptionText, option.selected ? styles.modalOptionTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  modalTitle: {
    color: "#102a43",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 4,
  },
  modalOption: {
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalOptionSelected: {
    borderColor: "#0f609b",
    backgroundColor: "#e8f3fb",
  },
  modalOptionText: {
    color: "#334e68",
    fontWeight: "600",
  },
  modalOptionTextSelected: {
    color: "#0f609b",
  },
});
