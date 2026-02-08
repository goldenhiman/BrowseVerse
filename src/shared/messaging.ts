// ============================================================
// Extension Messaging Types
// ============================================================

import type { PageMetadata } from './types';

// Messages from Content Script → Background
export type ContentMessage =
  | MetadataExtractedMessage
  | HighlightCapturedMessage;

export interface MetadataExtractedMessage {
  type: 'METADATA_EXTRACTED';
  payload: {
    url: string;
    title: string;
    favicon: string;
    metadata: PageMetadata;
  };
}

export interface HighlightCapturedMessage {
  type: 'HIGHLIGHT_CAPTURED';
  payload: {
    url: string;
    text: string;
    context_before: string;
    context_after: string;
  };
}

// Messages from Background → Content Script
export type BackgroundMessage =
  | RequestMetadataMessage;

export interface RequestMetadataMessage {
  type: 'REQUEST_METADATA';
}

// Messages from Popup/Dashboard → Background
export type UIMessage =
  | GetStatsMessage
  | GetTimelineMessage
  | OpenDashboardMessage
  | ExcludeDomainMessage
  | DeletePageMessage
  | GetPausedMessage
  | SetPausedMessage;

export interface GetStatsMessage {
  type: 'GET_STATS';
}

export interface GetTimelineMessage {
  type: 'GET_TIMELINE';
  payload: {
    from?: number;
    to?: number;
    domain?: string;
    limit?: number;
    offset?: number;
  };
}

export interface OpenDashboardMessage {
  type: 'OPEN_DASHBOARD';
}

export interface ExcludeDomainMessage {
  type: 'EXCLUDE_DOMAIN';
  payload: { domain: string };
}

export interface DeletePageMessage {
  type: 'DELETE_PAGE';
  payload: { pageId: number };
}

export interface GetPausedMessage {
  type: 'GET_PAUSED';
}

export interface SetPausedMessage {
  type: 'SET_PAUSED';
  payload: { paused: boolean };
}

// Response types
export interface StatsResponse {
  pages_today: number;
  total_pages: number;
  active_session: boolean;
  session_page_count: number;
  top_domains: Array<{ domain: string; count: number }>;
  total_dwell_time_today: number;
}
