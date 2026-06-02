/**
 * Auth stack layout — login / register / forgot password.
 * Full-screen, no system header, black background.
 */
import React from 'react';

import { Stack } from 'expo-router';

const AuthLayout: React.FC = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' },
        animation: 'slide_from_right',
      }}
    />
  );
};

export default AuthLayout;
