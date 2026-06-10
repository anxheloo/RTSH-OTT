/**
 * LaunchAdHost — shows the app-open ad once per session (design flow:
 * login → ad → home). Mounted above the router in `(app)/_layout` so it overlays
 * the whole authenticated app. The mock/backend decides whether a launch ad runs
 * (config `ads.launchEnabled`); this host just renders whatever creative it gets
 * and marks the slot consumed so navigation never re-triggers it. The
 * channel-switch (frequency-capped) + scheduled slots are Phase 16.
 */
import React, { useState } from 'react';

import { useAdQuery } from '@/api/queries';
import AdOverlay from '@/components/Media/AdOverlay';

// Session-scoped: survives layout re-renders so the launch ad shows at most once.
let launchAdConsumed = false;

const LaunchAdHost: React.FC = () => {
  const [done, setDone] = useState(launchAdConsumed);
  const { creative } = useAdQuery('launch', { enabled: !done });

  if (done || !creative) return null;

  return (
    <AdOverlay
      creative={creative}
      onComplete={() => {
        launchAdConsumed = true;
        setDone(true);
      }}
      testID="launch-ad"
    />
  );
};

export default LaunchAdHost;
