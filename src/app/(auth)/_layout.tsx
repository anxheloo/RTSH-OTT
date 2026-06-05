/**
 * Auth stack layout — login / register / forgot password.
 * Full-screen, no system header; content background follows the theme.
 */
import React from 'react';

import { Stack } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

const AuthLayout: React.FC = () => {
  const colors = useAppStore((s) => s.colors);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
};

export default AuthLayout;
