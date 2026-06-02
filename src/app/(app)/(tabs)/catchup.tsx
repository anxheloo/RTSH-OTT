/**
 * Catchup tab — catch-up TV / VOD content.
 * Scaffold only — content implemented in Phase 10 (Catchup).
 */
import React from 'react';

import FullScreenLoader from '@/components/Layout/FullScreenLoader';

const CatchupScreen: React.FC = () => {
  return <FullScreenLoader message="Catchup — coming soon" testID="catchup-screen-loader" />;
};

export default CatchupScreen;
