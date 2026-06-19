/**
 * LaunchAdHost — shows the APP_OPEN ad once per session. Mounted above the
 * router in `(app)/_layout` so it overlays the whole authenticated app. The
 * server decides whether an ad runs; this host just renders it and marks the
 * slot consumed so navigation never re-triggers it.
 */
import React, { useState } from 'react';

import { useAdQuery } from '@/api/queries';
import AdOverlay from '@/components/Media/AdOverlay';

let launchAdConsumed = false;

const LaunchAdHost: React.FC = () => {
  const [done, setDone] = useState(launchAdConsumed);
  const { creative } = useAdQuery({ placement: 'APP_OPEN' }, { enabled: !done });

  if (done || !creative) return null;

  const handleComplete = () => {
    launchAdConsumed = true;
    setDone(true);
  };

  return <AdOverlay creative={creative} onComplete={handleComplete} testID="launch-ad" />;
};

export default LaunchAdHost;
