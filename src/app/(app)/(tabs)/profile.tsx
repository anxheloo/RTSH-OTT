/**
 * Profile tab — user account, settings, logout.
 * Scaffold only — content implemented in Phase 12 (Profile).
 */
import React from 'react';

import FullScreenLoader from '@/components/Layout/FullScreenLoader';

const ProfileScreen: React.FC = () => {
  return <FullScreenLoader message="Profile — coming soon" testID="profile-screen-loader" />;
};

export default ProfileScreen;
