import { StyleSheet, Text, View } from "react-native";

type StateBannerProps = {
  variant: "success" | "error";
  message: string;
};

export function StateBanner({ variant, message }: StateBannerProps) {
  return (
    <View style={[styles.container, variant === "success" ? styles.success : styles.error]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  success: {
    backgroundColor: "#d9f7ec",
  },
  error: {
    backgroundColor: "#fde8e8",
  },
  text: {
    color: "#243b53",
    fontWeight: "600",
  },
});
