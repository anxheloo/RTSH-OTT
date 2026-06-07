export interface ThemeColors {
  // base
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHigh: string; // highest surface — active toggle / pressed (design --surf-3)
  cardBackground: string;
  // brand
  primary: string;
  primaryBright: string; // accent/gradient end (design --red-2)
  onPrimary: string;
  // text
  text: string;
  textMuted: string;
  mutedDim: string; // dimmer than textMuted — inactive nav / tertiary (design --mut-2)
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
  tabBarBorder: string; // tab-bar top hairline (design --line)
  inputBackground: string;
  headerBackground: string;
  videoPlaceholderBg: string;
}

/** Dark theme (default) — values from the designer HTML (2026-06-06, Phase 22.1) */
export const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#141417',
  surfaceElevated: '#1B1B20',
  surfaceHigh: '#26262C',
  cardBackground: '#141417',
  primary: '#EB122F',
  primaryBright: '#FF3A52',
  onPrimary: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#9A9AA2',
  mutedDim: '#6E6E77',
  onSurface: '#FFFFFF',
  link: '#EB122F',
  border: '#2A2A31',
  focus: '#EB122F',
  disabled: '#4B4B4B',
  overlay: 'rgba(0,0,0,0.6)',
  skeleton: '#1C1C1C',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#FBBF24',
  tabBar: 'rgba(10,10,12,0.92)',
  tabBarBorder: '#2A2A31',
  inputBackground: '#141417',
  headerBackground: 'transparent',
  videoPlaceholderBg: '#000000',
};

/** Light theme — retained as a feature (decision 6); dark is default. Design is dark-primary; light values are tuned equivalents. */
export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceElevated: '#E8E9EC',
  surfaceHigh: '#DCDEE3',
  cardBackground: '#FFFFFF',
  primary: '#EB122F',
  primaryBright: '#FF3A52',
  onPrimary: '#FFFFFF',
  text: '#0B0B0F',
  textMuted: '#6B7280',
  mutedDim: '#9CA3AF',
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
  tabBar: 'rgba(255,255,255,0.92)',
  tabBarBorder: '#E5E7EB',
  inputBackground: '#F3F4F6',
  headerBackground: 'transparent',
  videoPlaceholderBg: '#0B0B0F',
};
