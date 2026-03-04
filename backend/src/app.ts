import Fastify from "fastify";

import { createBookingService } from "./bookingService";
import { gymRoutes } from "./routes";

export function buildApp() {
  const app = Fastify({ logger: true });
  const bookingService = createBookingService();

  app.decorate("bookingService", bookingService);
  app.register(gymRoutes, { prefix: "/api" });

  return app;
}
