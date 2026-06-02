/**
 * Radio tab — RTSH radio channels with background audio.
 * Scaffold only — content implemented in Phase 9 (Radio Player).
 */
import React from 'react';

import FullScreenLoader from '@/components/Layout/FullScreenLoader';

const RadioScreen: React.FC = () => {
  return <FullScreenLoader message="Radio — coming soon" testID="radio-screen-loader" />;
};

export default RadioScreen;
