/**
 * EPG tab — Electronic Programme Guide.
 * Scaffold only — content implemented in Phase 10 (EPG).
 */
import React from 'react';

import FullScreenLoader from '@/components/Layout/FullScreenLoader';

const EpgScreen: React.FC = () => {
  return <FullScreenLoader message="EPG — coming soon" testID="epg-screen-loader" />;
};

export default EpgScreen;
