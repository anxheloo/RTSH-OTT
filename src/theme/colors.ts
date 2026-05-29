export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  tabBar: string;
  inputBackground: string;
  cardBackground: string;
  headerBackground: string;
  videoPlaceholderBg: string;
}

export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  text: '#0B0B0F',
  textMuted: '#6B7280',
  primary: '#E30613',
  onPrimary: '#FFFFFF',
  border: '#E5E7EB',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',
  tabBar: '#FFFFFF',
  inputBackground: '#F3F4F6',
  cardBackground: '#FFFFFF',
  headerBackground: '#FFFFFF',
  videoPlaceholderBg: '#0B0B0F',
};

export const darkTheme: ThemeColors = {
  background: '#0B0B0F',
  surface: '#15161B',
  text: '#F5F6F8',
  textMuted: '#9CA3AF',
  primary: '#FF1F2D',
  onPrimary: '#FFFFFF',
  border: '#26272E',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#FBBF24',
  tabBar: '#0F1014',
  inputBackground: '#1B1C22',
  cardBackground: '#15161B',
  headerBackground: '#0F1014',
  videoPlaceholderBg: '#000000',
};
