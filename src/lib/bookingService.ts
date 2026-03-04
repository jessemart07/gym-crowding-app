export type GymId = "gym-1" | "gym-2";

export type Slot = {
  id: string;
  label: string;
  capacity: number;
  bookedUsers: Set<string>;
};

export type Gym = {
  id: GymId;
  name: string;
  slots: Slot[];
};

export type BookingStatus = "booked" | "full" | "duplicate-user" | "idempotent-replay";

export type BookingReceipt = {
  status: BookingStatus;
  gymId: GymId;
  slotId: string;
  userId: string;
  receiptId: string;
  bookedCount: number;
  capacity: number;
  message: string;
};

export type CapacitySnapshot = {
  gymId: GymId;
  generatedAt: number;
  slots: Array<{
    slotId: string;
    label: string;
    bookedCount: number;
    capacity: number;
    fullnessPercent: number;
  }>;
};

class BookingLock {
  private chains = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(key) ?? Promise.resolve();

    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const chain = previous.then(() => current);
    this.chains.set(key, chain);
    await previous;

    try {
      return await fn();
    } finally {
      release();
      const active = this.chains.get(key);
      if (active === chain) {
        this.chains.delete(key);
      }
    }
  }
}

class GymBookingService {
  private readonly lock = new BookingLock();
  private readonly gyms = new Map<GymId, Gym>();
  private readonly idempotencyStore = new Map<string, BookingReceipt>();
  private readonly capacityCache = new Map<GymId, CapacitySnapshot>();
  private readonly CAPACITY_TTL_MS = 5_000;

  constructor() {
    this.seed();
  }

  private seed() {
    this.gyms.clear();
    this.idempotencyStore.clear();
    this.capacityCache.clear();

    this.gyms.set("gym-1", {
      id: "gym-1",
      name: "Downtown Gym",
      slots: [
        { id: "18:00", label: "18:00 - Peak", capacity: 5, bookedUsers: new Set() },
        { id: "19:00", label: "19:00", capacity: 8, bookedUsers: new Set() },
      ],
    });

    this.gyms.set("gym-2", {
      id: "gym-2",
      name: "Riverside Gym",
      slots: [
        { id: "18:00", label: "18:00", capacity: 4, bookedUsers: new Set() },
        { id: "20:00", label: "20:00", capacity: 6, bookedUsers: new Set() },
      ],
    });
  }

  reset() {
    this.seed();
  }

  listGyms(): Array<{ id: GymId; name: string; slots: Array<{ id: string; label: string; capacity: number }> }> {
    return Array.from(this.gyms.values()).map((gym) => ({
      id: gym.id,
      name: gym.name,
      slots: gym.slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        capacity: slot.capacity,
      })),
    }));
  }

  private getSlot(gymId: GymId, slotId: string): Slot {
    const gym = this.gyms.get(gymId);
    if (!gym) {
      throw new Error(`Gym ${gymId} not found`);
    }

    const slot = gym.slots.find((s) => s.id === slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found in ${gymId}`);
    }

    return slot;
  }

  getCapacity(gymId: GymId): CapacitySnapshot {
    const now = Date.now();
    const cached = this.capacityCache.get(gymId);
    if (cached && now - cached.generatedAt < this.CAPACITY_TTL_MS) {
      return cached;
    }

    const gym = this.gyms.get(gymId);
    if (!gym) {
      throw new Error(`Gym ${gymId} not found`);
    }

    const snapshot: CapacitySnapshot = {
      gymId,
      generatedAt: now,
      slots: gym.slots.map((slot) => {
        const bookedCount = slot.bookedUsers.size;
        return {
          slotId: slot.id,
          label: slot.label,
          bookedCount,
          capacity: slot.capacity,
          fullnessPercent: Math.round((bookedCount / slot.capacity) * 100),
        };
      }),
    };

    this.capacityCache.set(gymId, snapshot);
    return snapshot;
  }

  async bookSlot(input: { gymId: GymId; slotId: string; userId: string; idempotencyKey?: string }): Promise<BookingReceipt> {
    const slotKey = `${input.gymId}::${input.slotId}`;
    const idempotencyLookupKey = input.idempotencyKey
      ? `${slotKey}::${input.userId}::${input.idempotencyKey}`
      : undefined;

    return this.lock.runExclusive(slotKey, async () => {
      if (idempotencyLookupKey) {
        const existing = this.idempotencyStore.get(idempotencyLookupKey);
        if (existing) {
          return {
            ...existing,
            status: "idempotent-replay",
            message: "Idempotency key replayed. Returning original booking result.",
          };
        }
      }

      const slot = this.getSlot(input.gymId, input.slotId);
      await this.delay(40);

      if (slot.bookedUsers.has(input.userId)) {
        const duplicate: BookingReceipt = {
          status: "duplicate-user",
          gymId: input.gymId,
          slotId: input.slotId,
          userId: input.userId,
          receiptId: this.newReceiptId(),
          bookedCount: slot.bookedUsers.size,
          capacity: slot.capacity,
          message: "You have already booked this slot.",
        };

        if (idempotencyLookupKey) {
          this.idempotencyStore.set(idempotencyLookupKey, duplicate);
        }

        return duplicate;
      }

      if (slot.bookedUsers.size >= slot.capacity) {
        const full: BookingReceipt = {
          status: "full",
          gymId: input.gymId,
          slotId: input.slotId,
          userId: input.userId,
          receiptId: this.newReceiptId(),
          bookedCount: slot.bookedUsers.size,
          capacity: slot.capacity,
          message: "Slot is at full capacity.",
        };

        if (idempotencyLookupKey) {
          this.idempotencyStore.set(idempotencyLookupKey, full);
        }

        return full;
      }

      slot.bookedUsers.add(input.userId);
      this.capacityCache.delete(input.gymId);

      const booked: BookingReceipt = {
        status: "booked",
        gymId: input.gymId,
        slotId: input.slotId,
        userId: input.userId,
        receiptId: this.newReceiptId(),
        bookedCount: slot.bookedUsers.size,
        capacity: slot.capacity,
        message: "Booking confirmed.",
      };

      if (idempotencyLookupKey) {
        this.idempotencyStore.set(idempotencyLookupKey, booked);
      }

      return booked;
    });
  }

  async simulateParallelBookings(input: { gymId: GymId; slotId: string; attempts: number }): Promise<{
    attempts: number;
    successful: number;
    rejected: number;
    duplicate: number;
    finalBooked: number;
    capacity: number;
  }> {
    const calls = Array.from({ length: input.attempts }, (_, i) =>
      this.bookSlot({
        gymId: input.gymId,
        slotId: input.slotId,
        userId: `load-user-${i + 1}`,
      })
    );

    const results = await Promise.all(calls);
    const slot = this.getSlot(input.gymId, input.slotId);

    return {
      attempts: input.attempts,
      successful: results.filter((r) => r.status === "booked").length,
      rejected: results.filter((r) => r.status === "full").length,
      duplicate: results.filter((r) => r.status === "duplicate-user").length,
      finalBooked: slot.bookedUsers.size,
      capacity: slot.capacity,
    };
  }

  private newReceiptId() {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async delay(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

export const bookingService = new GymBookingService();
