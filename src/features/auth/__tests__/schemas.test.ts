import { registerSchema } from '../schemas';

const valid = {
  email: 'a@b.com',
  username: 'Anxhelo1',
  password: 'password1',
  confirmPassword: 'password1',
  birthDate: '1995-05-05',
  city: 'Tiranë',
  country: 'Albania',
  gender: 'male',
  education: 'high',
  acceptTerms: true,
} as const;

const usernameError = (username: string) =>
  registerSchema
    .safeParse({ ...valid, username })
    .error?.issues.find((i) => i.path[0] === 'username')?.message;

describe('registerSchema username', () => {
  it.each(['Anxhelo1', 'Ëndri', 'Përdorues', 'çaj123', '12345'])('accepts %s', (u) => {
    expect(usernameError(u)).toBeUndefined();
  });

  it.each([
    'anx😀',
    '👍👍👍',
    'anx_helo',
    'anx.helo',
    'anx helo',
    'anx-helo',
    'anx@1',
    '🇦🇱abc',
    'a​bc',
  ])('rejects %s', (u) => {
    expect(usernameError(u)).toBe('auth.errors.username_chars');
  });

  it('enforces length bounds', () => {
    expect(usernameError('ab')).toBe('auth.errors.username');
    expect(usernameError('a'.repeat(31))).toBe('auth.errors.username_max');
  });

  it('trims surrounding whitespace before checking', () => {
    expect(usernameError('  Anxhelo  ')).toBeUndefined();
  });
});

describe('registerSchema city', () => {
  const cityError = (city: string, country: string) =>
    registerSchema
      .safeParse({ ...valid, city, country })
      .error?.issues.find((i) => i.path[0] === 'city')?.message;

  it("accepts a city from the selected country's list", () => {
    expect(cityError('Tiranë', 'Albania')).toBeUndefined();
    expect(cityError('Shkodër', 'Albania')).toBeUndefined();
    expect(cityError('Gjakovë', 'Kosovo')).toBeUndefined();
  });

  it('offers the country itself when it has no city data (city-states)', () => {
    expect(cityError('Gibraltar', 'Gibraltar')).toBeUndefined();
  });

  it('rejects a city from another country', () => {
    expect(cityError('Tiranë', 'United States')).toBe('auth.errors.city_invalid');
  });

  it('accepts "Other" for a town that is not listed', () => {
    expect(cityError('Other', 'Albania')).toBeUndefined();
  });

  it('includes the municipalities the dataset was missing', () => {
    expect(cityError('Elbasan', 'Albania')).toBeUndefined();
    expect(cityError('Prishtinë', 'Kosovo')).toBeUndefined();
  });

  it('lists every town in Albania, Kosovo and Montenegro, only the largest cities elsewhere', () => {
    expect(cityError('Žabljak', 'Montenegro')).toBeUndefined();
    expect(cityError('Skopje', 'Macedonia')).toBeUndefined();
    expect(cityError('Milan', 'Italy')).toBeUndefined();
    // A small town outside the three full countries is registered as "Other".
    expect(cityError('Debar', 'Macedonia')).toBe('auth.errors.city_invalid');
    expect(cityError('Other', 'Macedonia')).toBeUndefined();
  });

  it('rejects a free-typed city not in the list', () => {
    expect(cityError('Atlantis', 'Albania')).toBe('auth.errors.city_invalid');
  });

  it('still reports a missing city as required', () => {
    expect(cityError('', 'Albania')).toBe('auth.errors.city_required');
  });
});
