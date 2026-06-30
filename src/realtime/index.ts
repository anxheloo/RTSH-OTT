/**
 * Real-time (STOMP) layer barrel. Import from '@/realtime'.
 */
export { connectRealtime, disconnectRealtime, publish, subscribe } from './client';
export type { GeoEvent, MidrollEvent, MidrollOp, WatchEndMsg, WatchKind, WatchStartMsg } from './events';
export { STOMP_DEST, WS_URL } from './events';
export {
  midrollFireMs,
  midrollLapsed,
  type MidrollWindow,
  nextMidrollBoundaryMs,
  selectDueMidroll,
} from './midroll';
