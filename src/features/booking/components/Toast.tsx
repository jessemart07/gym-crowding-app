import { Pressable, StyleSheet, Text, View } from "react-native";

type ToastProps = {
  message: string | null;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={styles.toast} onPress={onClose} accessibilityRole="button">
        <View style={styles.iconBubble}>
          <Text style={styles.iconText}>!</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(17, 24, 39, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
  },
  iconText: {
    color: "#fff",
    fontWeight: "800",
    lineHeight: 16,
    fontSize: 13,
  },
  message: {
    color: "#f8fafc",
    flex: 1,
    fontWeight: "600",
  },
});
