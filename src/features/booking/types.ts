export type GymId = "gym-1" | "gym-2";

export type SlotCapacity = {
  slotId: string;
  label: string;
  capacity: number;
  bookedCount: number;
  fullnessPercent: number;
};

export type CapacityResponse = {
  gymId: GymId;
  fullnessPercent: number;
  slots: SlotCapacity[];
  generatedAt: string;
  cached: boolean;
};

export type GymSummary = {
  gymId: GymId;
  name: string;
  slots: Array<{ slotId: string; label: string; capacity: number; bookedCount: number }>;
};

export type BookingReceipt = {
  status: "booked" | "full" | "duplicate-user" | "idempotent-replay";
  bookingId: string;
  gymId: GymId;
  gymName: string;
  slotId: string;
  slotLabel: string;
  userId: string;
  bookedCount: number;
  capacity: number;
  message: string;
  createdAt: string;
};
