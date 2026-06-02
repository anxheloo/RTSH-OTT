import { Platform } from 'react-native';

const shadow = (elevation: number, opacity: number, radius: number, offsetY: number) =>
  Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  });

export const SHADOWS = {
  none: {},
  sm: shadow(2, 0.12, 2, 1),
  md: shadow(4, 0.16, 4, 2),
  lg: shadow(8, 0.2, 8, 4),
  card: shadow(3, 0.14, 3, 2),
  modal: shadow(16, 0.32, 16, 8),
} as const;
