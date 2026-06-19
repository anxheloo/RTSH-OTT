import type { Channel } from '@/types/domain';

import { getChannels } from './channels';

/** Radio stations are channels with `type: 'RADIO'` from the unified endpoint. */
export async function getRadioStations(): Promise<Channel[]> {
  return getChannels('RADIO');
}
