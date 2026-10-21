export const natsWrapper = {
  client: {
    publish: vi.fn().mockResolvedValue({ stream: 'TICKETING', seq: 1, duplicate: false }),
  },
};
