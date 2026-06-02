export interface ThemeColors {
  // base
  background: string;
  surface: string;
  surfaceElevated: string;
  cardBackground: string;
  // brand
  primary: string;
  onPrimary: string;
  // text
  text: string;
  textMuted: string;
  onSurface: string;
  link: string;
  // semantic
  border: string;
  focus: string;
  disabled: string;
  overlay: string;
  skeleton: string;
  success: string;
  error: string;
  warning: string;
  // ui regions
  tabBar: string;
  inputBackground: string;
  headerBackground: string;
  videoPlaceholderBg: string;
}

/** Dark theme — values verified against Figma design (2026-06-02) */
export const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#212121',
  surfaceElevated: '#373737',
  cardBackground: '#141414',
  primary: '#EB122F',
  onPrimary: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#929292',
  onSurface: '#FFFFFF',
  link: '#EB122F',
  border: '#2C2C2C',
  focus: '#EB122F',
  disabled: '#4B4B4B',
  overlay: 'rgba(0,0,0,0.72)',
  skeleton: '#1C1C1C',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#FBBF24',
  tabBar: '#212121',
  inputBackground: '#212121',
  headerBackground: '#212121',
  videoPlaceholderBg: '#000000',
};

/** Light theme — RTSH light palette (design is dark-primary; these are safe defaults) */
export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceElevated: '#E8E9EC',
  cardBackground: '#FFFFFF',
  primary: '#EB122F',
  onPrimary: '#FFFFFF',
  text: '#0B0B0F',
  textMuted: '#6B7280',
  onSurface: '#0B0B0F',
  link: '#EB122F',
  border: '#E5E7EB',
  focus: '#EB122F',
  disabled: '#9CA3AF',
  overlay: 'rgba(0,0,0,0.5)',
  skeleton: '#E9EAEC',
  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',
  tabBar: '#FFFFFF',
  inputBackground: '#F3F4F6',
  headerBackground: '#FFFFFF',
  videoPlaceholderBg: '#0B0B0F',
};
