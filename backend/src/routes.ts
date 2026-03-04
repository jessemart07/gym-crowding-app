import { FastifyPluginAsync } from "fastify";

import { DomainError, type GymId } from "./domain";

function mapDomainError(error: unknown) {
  if (error instanceof DomainError) {
    return {
      statusCode: error.code === "BAD_REQUEST" ? 400 : 404,
      body: { error: error.message },
    };
  }

  return {
    statusCode: 500,
    body: { error: "Unexpected error" },
  };
}

export const gymRoutes: FastifyPluginAsync = async (app) => {
  app.get("/gyms", async (_request, reply) => {
    reply.send({ gyms: app.bookingService.listGyms() });
  });

  app.get<{ Params: { id: GymId } }>("/gyms/:id/capacity", async (request, reply) => {
    try {
      const payload = app.bookingService.getCapacity(request.params.id);
      reply.send(payload);
    } catch (error) {
      const mapped = mapDomainError(error);
      reply.status(mapped.statusCode).send(mapped.body);
    }
  });

  app.post<{
    Params: { id: GymId };
    Body: { slotId: string; userId: string; idempotencyKey?: string };
  }>("/gyms/:id/book", async (request, reply) => {
    try {
      const payload = await app.bookingService.bookSlot({
        gymId: request.params.id,
        slotId: request.body.slotId,
        userId: request.body.userId,
        idempotencyKey: request.body.idempotencyKey,
      });

      reply.send(payload);
    } catch (error) {
      const mapped = mapDomainError(error);
      reply.status(mapped.statusCode).send(mapped.body);
    }
  });

  app.post("/debug/reset", async (_request, reply) => {
    app.bookingService.reset();
    reply.send({ ok: true });
  });
};
