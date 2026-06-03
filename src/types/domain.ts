export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Channel {
  id: string;
  name: string;
  logoUrl: string;
  category: 'tv' | 'kids' | 'news' | 'sport' | 'music' | 'parliament';
  streamUrl: string;
}

export interface EpgItem {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  isAdult: boolean;
  thumbnail?: string;
}

export interface CatchupItem {
  id: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  duration: number;  // seconds
  thumbnail?: string;
  streamUrl: string;
  airDate: string;   // ISO 8601
  isAdult: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  logoUrl: string;
}

export interface AppConfig {
  version: string;
  forceUpdate: boolean;
  minVersion: string;
  tcUrl: string;
  privacyUrl: string;
  ads: {
    launchEnabled: boolean;
    channelSwitchEnabled: boolean;
    channelSwitchFrequency: number;
    scheduledEnabled: boolean;
  };
  geoRestricted: boolean;
  supportedLocales: string[];
}
