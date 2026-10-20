import type { Mock } from "vitest";
import mongoose from 'mongoose';
import request from 'supertest';

import { app } from '../../src/app';
import { Order, OrderStatus } from '../../src/models/order';
import { Ticket } from '../../src/models/ticket';
import { natsWrapper } from '../../src/nats-wrapper';

it("returns an error if the ticket does not exist", async () => {
  const ticketId = new mongoose.Types.ObjectId();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send({ ticketId })
    .expect(404);
});

it("returns an error if the ticket is already reserved", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  const ticket = Ticket.build({
    id,
    title: "concert",
    price: 20,
  });
  await ticket.save();
  const order = Order.build({
    ticket,
    userId: "fake-id-01",
    status: OrderStatus.Created,
    expiresAt: new Date(),
  });
  await order.save();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send({ ticketId: ticket.id })
    .expect(400);
});

it("reserves a ticket", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  const ticket = Ticket.build({
    id,
    title: "concert",
    price: 20,
  });
  await ticket.save();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send({ ticketId: ticket.id })
    .expect(201);
});

it("emits an order created event", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  const ticket = Ticket.build({
    id,
    title: "concert",
    price: 20,
  });
  await ticket.save();

  await request(app)
    .post("/api/orders")
    .set("Cookie", global.signin())
    .send({ ticketId: ticket.id })
    .expect(201);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});

it('uses the configured expiration in the response, database, and published event', async () => {
  const original = process.env.ORDER_EXPIRATION_SECONDS;
  process.env.ORDER_EXPIRATION_SECONDS = '15';

  try {
    const ticket = Ticket.build({
      id: new mongoose.Types.ObjectId().toHexString(),
      title: 'Expiration test',
      price: 20,
    });
    await ticket.save();
    const before = Date.now();
    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', global.signin())
      .send({ ticketId: ticket.id })
      .expect(201);
    const after = Date.now();
    const expiresAt = Date.parse(response.body.expiresAt);

    expect(expiresAt).toBeGreaterThanOrEqual(before + 15000);
    expect(expiresAt).toBeLessThanOrEqual(after + 15000);
    const stored = await Order.findById(response.body.id);
    expect(stored!.expiresAt.toISOString()).toBe(response.body.expiresAt);
    const event = JSON.parse(new TextDecoder().decode((natsWrapper.client.publish as Mock).mock.calls[0][1]));
    expect(event.expiresAt).toBe(response.body.expiresAt);
  } finally {
    if (original === undefined) delete process.env.ORDER_EXPIRATION_SECONDS;
    else process.env.ORDER_EXPIRATION_SECONDS = original;
  }
});
