import { StyleSheet, Text, View } from "react-native";

type CapacityRingProps = {
  fullnessPercent: number;
};

export function CapacityRing({ fullnessPercent }: CapacityRingProps) {
  const color = fullnessPercent >= 90 ? "#d64545" : fullnessPercent >= 70 ? "#d9921a" : "#0f7b6c";

  return (
    <View style={styles.container}>
      <View style={[styles.ring, { borderColor: color }]}> 
        <Text style={[styles.percent, { color }]}>{fullnessPercent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  percent: {
    fontSize: 22,
    fontWeight: "800",
  },
  caption: {
    color: "#486581",
    fontWeight: "600",
  },
});
