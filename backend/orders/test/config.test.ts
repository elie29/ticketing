import { getExpirationWindowSeconds } from '../src/config';

it('defaults order expiration to fifteen minutes', () => {
  expect(getExpirationWindowSeconds({})).toBe(900);
});

it('accepts a shorter configured expiration window', () => {
  expect(getExpirationWindowSeconds({ ORDER_EXPIRATION_SECONDS: '15' })).toBe(15);
});

it.each(['', '0', '-1', '1.5', 'invalid', 'Infinity'])(
  'rejects an invalid expiration window: %s', value => {
    expect(() => getExpirationWindowSeconds({ ORDER_EXPIRATION_SECONDS: value }))
      .toThrow('ORDER_EXPIRATION_SECONDS must be a positive integer');
  }
);