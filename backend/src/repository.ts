import { DomainError, type GymId, type GymState } from "./domain";

type InternalSlot = {
  slotId: string;
  label: string;
  capacity: number;
  bookedUsers: Set<string>;
};

type InternalGym = {
  gymId: GymId;
  name: string;
  slots: InternalSlot[];
};

export interface GymRepository {
  listGyms(): GymState[];
  getGym(gymId: GymId): InternalGym;
  getSlot(gymId: GymId, slotId: string): InternalSlot;
  reset(): void;
}

const seedData: InternalGym[] = [
  {
    gymId: "gym-1",
    name: "Downtown Gym",
    slots: [
      { slotId: "18:00", label: "18:00", capacity: 5, bookedUsers: new Set() },
      { slotId: "19:00", label: "19:00", capacity: 8, bookedUsers: new Set() },
      { slotId: "20:00", label: "20:00", capacity: 10, bookedUsers: new Set() },
    ],
  },
  {
    gymId: "gym-2",
    name: "Riverside Gym",
    slots: [
      { slotId: "16:00", label: "16:00", capacity: 4, bookedUsers: new Set() },
      { slotId: "18:00", label: "18:00", capacity: 10, bookedUsers: new Set() },
      { slotId: "20:00", label: "20:00", capacity: 10, bookedUsers: new Set() },
    ],
  },
];

export class InMemoryGymRepository implements GymRepository {
  private gyms = new Map<GymId, InternalGym>();

  constructor() {
    this.reset();
  }

  reset() {
    this.gyms.clear();
    for (const gym of seedData) {
      this.gyms.set(gym.gymId, {
        gymId: gym.gymId,
        name: gym.name,
        slots: gym.slots.map((slot) => ({
          slotId: slot.slotId,
          label: slot.label,
          capacity: slot.capacity,
          bookedUsers: new Set(),
        })),
      });
    }
  }

  listGyms(): GymState[] {
    return Array.from(this.gyms.values()).map((gym) => ({
      gymId: gym.gymId,
      name: gym.name,
      slots: gym.slots.map((slot) => ({
        slotId: slot.slotId,
        label: slot.label,
        capacity: slot.capacity,
        bookedCount: slot.bookedUsers.size,
      })),
    }));
  }

  getGym(gymId: GymId): InternalGym {
    const gym = this.gyms.get(gymId);
    if (!gym) {
      throw new DomainError(`Gym ${gymId} not found`, "NOT_FOUND");
    }

    return gym;
  }

  getSlot(gymId: GymId, slotId: string): InternalSlot {
    const gym = this.getGym(gymId);
    const slot = gym.slots.find((s) => s.slotId === slotId);

    if (!slot) {
      throw new DomainError(`Slot ${slotId} not found`, "NOT_FOUND");
    }

    return slot;
  }
}
