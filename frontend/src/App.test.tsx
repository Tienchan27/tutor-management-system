import { requirePhoneOrFacebook } from './utils/validation';

test('validates profile completion requirements', () => {
  expect(requirePhoneOrFacebook('', '')).toBe(false);
  expect(requirePhoneOrFacebook('0912345678', '')).toBe(true);
  expect(requirePhoneOrFacebook('', 'facebook.com/profile')).toBe(true);
});
