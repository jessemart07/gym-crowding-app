import { BookingService } from "./bookingService";

declare module "fastify" {
  interface FastifyInstance {
    bookingService: BookingService;
  }
}
