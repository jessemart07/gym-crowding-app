export type GymId = "gym-1" | "gym-2";

export type SlotState = {
  slotId: string;
  label: string;
  capacity: number;
  bookedCount: number;
};

export type GymState = {
  gymId: GymId;
  name: string;
  slots: SlotState[];
};

export type CapacityResponse = {
  gymId: GymId;
  fullnessPercent: number;
  slots: Array<SlotState & { fullnessPercent: number }>;
  generatedAt: string;
  cached: boolean;
};

export type BookSlotCommand = {
  gymId: GymId;
  slotId: string;
  userId: string;
  idempotencyKey?: string;
};

export type BookingStatus = "booked" | "full" | "duplicate-user" | "idempotent-replay";

export type BookingReceipt = {
  status: BookingStatus;
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

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "BAD_REQUEST"
  ) {
    super(message);
  }
}
