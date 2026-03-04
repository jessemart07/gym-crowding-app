import { BookingLock } from "./bookingLock";
import {
  DomainError,
  type BookSlotCommand,
  type BookingReceipt,
  type CapacityResponse,
  type GymId,
} from "./domain";
import { type GymRepository, InMemoryGymRepository } from "./repository";

type CapacityCacheEntry = {
  cachedAt: number;
  response: Omit<CapacityResponse, "cached">;
};

const CAPACITY_CACHE_TTL_MS = 5_000;

export class BookingService {
  private readonly lock = new BookingLock();
  private readonly idempotencyStore = new Map<string, BookingReceipt>();
  private readonly capacityCache = new Map<GymId, CapacityCacheEntry>();

  constructor(private readonly repository: GymRepository) {}

  listGyms() {
    return this.repository.listGyms();
  }

  reset() {
    this.repository.reset();
    this.idempotencyStore.clear();
    this.capacityCache.clear();
  }

  getCapacity(gymId: GymId): CapacityResponse {
    const now = Date.now();
    const cached = this.capacityCache.get(gymId);

    if (cached && now - cached.cachedAt < CAPACITY_CACHE_TTL_MS) {
      return {
        ...cached.response,
        cached: true,
      };
    }

    const gym = this.repository.getGym(gymId);
    const slotsWithFullness = gym.slots.map((slot) => ({
      ...slot,
      fullnessPercent: Math.round((slot.bookedUsers.size / slot.capacity) * 100),
      bookedCount: slot.bookedUsers.size,
    }));

    const totalCapacity = slotsWithFullness.reduce((acc, slot) => acc + slot.capacity, 0);
    const totalBooked = slotsWithFullness.reduce((acc, slot) => acc + slot.bookedCount, 0);

    const responseBase = {
      gymId,
      fullnessPercent: totalCapacity === 0 ? 0 : Math.round((totalBooked / totalCapacity) * 100),
      slots: slotsWithFullness,
      generatedAt: new Date(now).toISOString(),
    };

    this.capacityCache.set(gymId, {
      cachedAt: now,
      response: responseBase,
    });

    return {
      ...responseBase,
      cached: false,
    };
  }

  async bookSlot(command: BookSlotCommand): Promise<BookingReceipt> {
    if (!command.userId.trim()) {
      throw new DomainError("userId is required", "BAD_REQUEST");
    }

    const lockKey = `${command.gymId}::${command.slotId}`;
    const idempotencyKey = command.idempotencyKey
      ? `${lockKey}::${command.userId}::${command.idempotencyKey}`
      : undefined;

    return this.lock.runExclusive(lockKey, async () => {
      if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
        const existing = this.idempotencyStore.get(idempotencyKey);
        if (!existing) {
          throw new DomainError("Idempotency store inconsistency", "BAD_REQUEST");
        }

        return {
          ...existing,
          status: "idempotent-replay",
          message: "Idempotency key replayed, returning stored response.",
        };
      }

      const gym = this.repository.getGym(command.gymId);
      const slot = this.repository.getSlot(command.gymId, command.slotId);
      await this.simulateLatency(20);

      if (slot.bookedUsers.has(command.userId)) {
        const duplicate = this.buildReceipt(command, gym.name, slot, "duplicate-user", "You have already booked this slot.");
        this.storeIdempotentResult(idempotencyKey, duplicate);
        return duplicate;
      }

      if (slot.bookedUsers.size >= slot.capacity) {
        const full = this.buildReceipt(command, gym.name, slot, "full", "Slot is full.");
        this.storeIdempotentResult(idempotencyKey, full);
        return full;
      }

      slot.bookedUsers.add(command.userId);
      this.capacityCache.delete(command.gymId);

      const booked = this.buildReceipt(command, gym.name, slot, "booked", "Booking confirmed.");
      this.storeIdempotentResult(idempotencyKey, booked);
      return booked;
    });
  }

  private buildReceipt(
    command: BookSlotCommand,
    gymName: string,
    slot: { label: string; capacity: number; bookedUsers: Set<string> },
    status: BookingReceipt["status"],
    message: string
  ): BookingReceipt {
    return {
      status,
      bookingId: `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      gymId: command.gymId,
      gymName,
      slotId: command.slotId,
      slotLabel: slot.label,
      userId: command.userId,
      bookedCount: slot.bookedUsers.size,
      capacity: slot.capacity,
      message,
      createdAt: new Date().toISOString(),
    };
  }

  private storeIdempotentResult(idempotencyKey: string | undefined, receipt: BookingReceipt) {
    if (!idempotencyKey) {
      return;
    }

    this.idempotencyStore.set(idempotencyKey, receipt);
  }

  private async simulateLatency(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}

export function createBookingService(repository?: GymRepository) {
  return new BookingService(repository ?? new InMemoryGymRepository());
}
