/** Mock auth fixtures — wire-shaped (backend `UserDTO` / `LoginResponseDTO`). */

export const mockUserDto = {
  id: 1,
  email: 'test@rtsh.al',
  username: 'testuser',
  birthDate: '1998-03-14',
  city: 'Tiranë',
  country: 'Shqipëri',
  gender: 'MALE',
  educationLevel: 'HIGH',
};

export const mockTokens = {
  accessToken: 'mock-access-token-rtsh-2026',
  refreshToken: 'mock-refresh-token-rtsh-2026',
};
