import { type BookingReceipt, type CapacityResponse, type GymId, type GymSummary } from "../features/booking/types";

const DEFAULT_API_BASE_URL = "http://localhost:3000/api";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const maybeJson = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(maybeJson?.error ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const gymApi = {
  baseUrl: API_BASE_URL,

  listGyms: async () => {
    const payload = await request<{ gyms: GymSummary[] }>("/gyms");
    return payload.gyms;
  },

  getCapacity: async (gymId: GymId) => {
    return request<CapacityResponse>(`/gyms/${gymId}/capacity`);
  },

  bookSlot: async (input: { gymId: GymId; slotId: string; userId: string; idempotencyKey?: string }) => {
    return request<BookingReceipt>(`/gyms/${input.gymId}/book`, {
      method: "POST",
      body: JSON.stringify({
        slotId: input.slotId,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey,
      }),
    });
  },
};
