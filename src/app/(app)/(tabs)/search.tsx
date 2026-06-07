/**
 * Search tab (Kërko). Stub — full search UI (channels grid, programs, recent
 * chips) lands in Phase 22.9. Kept minimal so the 4-tab shell is complete.
 */
import React from 'react';

import { ScreenLayout, TabHeader } from '@/components/Layout';

const SearchScreen: React.FC = () => (
  <ScreenLayout>
    <TabHeader title="Kërko" />
  </ScreenLayout>
);

export default SearchScreen;
