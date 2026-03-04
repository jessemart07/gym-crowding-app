import { describe, expect, it } from "vitest";

import { createBookingService } from "../src/bookingService";

describe("BookingService", () => {
  it("prevents overbooking during concurrent requests", async () => {
    const service = createBookingService();

    const attempts = Array.from({ length: 50 }, (_, index) =>
      service.bookSlot({
        gymId: "gym-1",
        slotId: "18:00",
        userId: `load-user-${index + 1}`,
      })
    );

    const results = await Promise.all(attempts);

    const booked = results.filter((result) => result.status === "booked").length;
    const full = results.filter((result) => result.status === "full").length;

    expect(booked).toBe(5);
    expect(full).toBe(45);
  });

  it("returns idempotent replay for repeated idempotency key", async () => {
    const service = createBookingService();

    const first = await service.bookSlot({
      gymId: "gym-1",
      slotId: "19:00",
      userId: "user-123",
      idempotencyKey: "req-1",
    });

    const second = await service.bookSlot({
      gymId: "gym-1",
      slotId: "19:00",
      userId: "user-123",
      idempotencyKey: "req-1",
    });

    expect(first.status).toBe("booked");
    expect(second.status).toBe("idempotent-replay");
    expect(second.bookingId).toBe(first.bookingId);
  });
});
