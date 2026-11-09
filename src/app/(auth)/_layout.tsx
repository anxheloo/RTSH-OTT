/**
 * Auth stack layout — login / register / forgot password.
 * Full-screen, no system header; content background follows the theme.
 */
import React from 'react';

import { Stack } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { getStatusBarScreenOptions } from '@/utils/navigation';

const AuthLayout: React.FC = () => {
  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        ...getStatusBarScreenOptions(mode),
      }}
    />
  );
};

export default AuthLayout;
