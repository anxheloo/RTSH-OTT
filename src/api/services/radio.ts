import type { Channel } from '@/types/domain';

import { getChannelById, getChannels } from './channels';

/** Radio stations are channels with `type: 'RADIO'` from the unified endpoint. */
export async function getRadioStations(): Promise<Channel[]> {
  return getChannels('RADIO');
}

export async function getRadioById(id: string): Promise<Channel> {
  return getChannelById(id);
}
