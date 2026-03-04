import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { gymApi } from "@/api/api";
import { CapacityRing } from "@/features/booking/components/CapacityRing";
import { PrimaryButton } from "@/features/booking/components/PrimaryButton";
import { SelectionModal } from "@/features/booking/components/SelectionModal";
import { Toast } from "@/features/booking/components/Toast";
import { type BookingReceipt, type CapacityResponse, type GymId, type GymSummary } from "@/features/booking/types";

export default function Index() {
  const [gyms, setGyms] = useState<GymSummary[]>([]);
  const [gymId, setGymId] = useState<GymId | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [capacity, setCapacity] = useState<CapacityResponse | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [gymModalVisible, setGymModalVisible] = useState(false);
  const [slotModalVisible, setSlotModalVisible] = useState(false);

  const selectedGym = useMemo(() => gyms.find((gym) => gym.gymId === gymId) ?? null, [gyms, gymId]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!gymId) {
      return;
    }

    void refreshCapacity(gymId);
  }, [gymId]);

  async function bootstrap() {
    try {
      setIsFetchingData(true);
      const gymList = await gymApi.listGyms();
      setGyms(gymList);

      const defaultGymId = gymList[0]?.gymId;
      const defaultSlotId = gymList[0]?.slots[0]?.slotId;
      if (defaultGymId && defaultSlotId) {
        setGymId(defaultGymId);
        setSlotId(defaultSlotId);
      }
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load gyms");
    } finally {
      setIsFetchingData(false);
    }
  }

  async function refreshCapacity(targetGymId: GymId, options?: { showLoader?: boolean }) {
    const showLoader = options?.showLoader ?? true;

    try {
      if (showLoader) {
        setIsFetchingData(true);
      }

      const liveCapacity = await gymApi.getCapacity(targetGymId);
      setCapacity(liveCapacity);
    } catch (capacityError) {
      setError(capacityError instanceof Error ? capacityError.message : "Failed to load capacity");
    } finally {
      if (showLoader) {
        setIsFetchingData(false);
      }
    }
  }

  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3000);
  }

  async function handleBook() {
    if (!gymId || !slotId) {
      return;
    }

    const name = memberName.trim();
    if (!name) {
      showToast("Please enter your name to book a slot.");
      return;
    }

    const derivedUserId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    try {
      setError(null);
      setIsBooking(true);
      const result = await gymApi.bookSlot({
        gymId,
        slotId,
        userId: derivedUserId || `member-${Date.now()}`,
      });

      if (result.status === "booked" || result.status === "idempotent-replay") {
        setReceipt(result);
        setSuccessModalVisible(true);
      } else {
        showToast(result.message);
      }

      await refreshCapacity(gymId, { showLoader: false });
    } catch (bookError) {
      showToast(bookError instanceof Error ? bookError.message : "Booking failed");
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>GymCrowding</Text>
        <Text style={styles.subtitle}>
          Live capacity + slot booking backed by Fastify API ({gymApi.baseUrl})
        </Text>

        {isFetchingData ? <ActivityIndicator size="small" color="#0f609b" /> : null}
        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select gym</Text>
          <Pressable style={styles.selectorButton} onPress={() => setGymModalVisible(true)}>
            <Text style={styles.selectorButtonText}>{selectedGym?.name ?? "Choose gym"}</Text>
          </Pressable>
        </View>

        {selectedGym ? (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select slot</Text>
          <Pressable style={styles.selectorButton} onPress={() => setSlotModalVisible(true)}>
            <Text style={styles.selectorButtonText}>
              {selectedGym.slots.find((slot) => slot.slotId === slotId)?.label ?? "Choose slot"}
            </Text>
          </Pressable>
          </View>
        ) : null}

        <SelectionModal
          visible={gymModalVisible}
          title="Select gym"
          onClose={() => setGymModalVisible(false)}
          options={gyms.map((gym) => ({
            key: gym.gymId,
            label: gym.name,
            selected: gym.gymId === gymId,
            onPress: () => {
              setGymId(gym.gymId);
              setSlotId(gym.slots[0]?.slotId ?? null);
              setReceipt(null);
              setGymModalVisible(false);
            },
          }))}
        />

        <SelectionModal
          visible={slotModalVisible}
          title="Select slot"
          onClose={() => setSlotModalVisible(false)}
          options={(selectedGym?.slots ?? []).map((slot) => ({
            key: slot.slotId,
            label: `${slot.label} (cap ${slot.capacity})`,
            selected: slot.slotId === slotId,
            onPress: () => {
              setSlotId(slot.slotId);
              setSlotModalVisible(false);
            },
          }))}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book</Text>
          <TextInput
            style={styles.input}
            value={memberName}
            onChangeText={setMemberName}
            placeholder="your name"
            autoCapitalize="words"
          />
          <Text style={styles.muted}>We will reserve the slot under this name.</Text>

          <View style={styles.actions}>
            <PrimaryButton label="Book Slot" onPress={handleBook} loading={isBooking} disabled={isFetchingData} />
          </View>
        </View>

        {capacity ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capacity</Text>
            <CapacityRing fullnessPercent={capacity.fullnessPercent} />
            {capacity.slots.map((slot) => (
              <View key={slot.slotId} style={styles.capacityCard}>
                <Text style={styles.capacityTitle}>{slot.label}</Text>
                <Text style={styles.capacityText}>
                  {slot.bookedCount}/{slot.capacity} booked ({slot.fullnessPercent}% full)
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <BookingSuccessModal
        visible={successModalVisible}
        receipt={receipt}
        onClose={() => setSuccessModalVisible(false)}
      />

      {isFetchingData ? (
        <View style={styles.screenLoader} pointerEvents="auto">
          <View style={styles.screenLoaderCard}>
            <ActivityIndicator size="large" color="#0f609b" />
            <Text style={styles.screenLoaderText}>Loading latest data...</Text>
          </View>
        </View>
      ) : null}

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
}

function BookingSuccessModal(props: { visible: boolean; receipt: BookingReceipt | null; onClose: () => void }) {
  if (!props.receipt) {
    return null;
  }

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <Pressable style={styles.modalBackdrop} onPress={props.onClose}>
        <Pressable style={styles.successModalCard} onPress={() => undefined}>
          <View style={styles.successIconCircle}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Booking Confirmed</Text>
          <Text style={styles.successMessage}>{props.receipt.message}</Text>
          <Text style={styles.successDetail}>Booking ID: {props.receipt.bookingId}</Text>
          <Text style={styles.successDetail}>Gym: {props.receipt.gymName || props.receipt.gymId}</Text>
          <Text style={styles.successDetail}>Slot: {props.receipt.slotLabel || props.receipt.slotId}</Text>
          <PrimaryButton label="Done" onPress={props.onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f6f8",
  },
  container: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#102a43",
  },
  subtitle: {
    color: "#486581",
    fontSize: 14,
  },
  inlineError: {
    color: "#b42318",
    fontWeight: "600",
  },
  muted: {
    color: "#627d98",
    fontSize: 12,
  },
  section: {
    borderWidth: 1,
    borderColor: "#d9e2ec",
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102a43",
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: "#bcccdc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#fff",
  },
  selectorButtonText: {
    color: "#243b53",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#bcccdc",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  actions: {
    gap: 8,
  },
  capacityCard: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f0f4f8",
  },
  capacityTitle: {
    color: "#102a43",
    fontWeight: "700",
    marginBottom: 2,
  },
  capacityText: {
    color: "#486581",
  },
  mono: {
    fontFamily: "Courier",
    color: "#243b53",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  successModalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    alignItems: "center",
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#0f9d58",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successIconText: {
    color: "#fff",
    fontSize: 56,
    fontWeight: "800",
    lineHeight: 58,
  },
  successTitle: {
    color: "#102a43",
    fontWeight: "800",
    fontSize: 20,
  },
  successMessage: {
    color: "#486581",
    textAlign: "center",
    marginBottom: 4,
  },
  successDetail: {
    color: "#243b53",
    alignSelf: "stretch",
  },
  screenLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  screenLoaderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#d9e2ec",
  },
  screenLoaderText: {
    color: "#334e68",
    fontWeight: "600",
  },
});
