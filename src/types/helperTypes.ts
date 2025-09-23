// Types for helperFunctions.ts
// Format processing and helper-specific interfaces

import { YtDlpFormat } from './wrapperTypes';

// ================= Helper Function Types =================

// Optional extras added during in-app processing (see helperFunctions.ts)
export type FormatType = "video-only" | "audio-only" | "combined";

export interface CombinedFormatExtras {
  isCombined: boolean; // whether it's a single muxed stream or a composed pair
  combinedFormat: string; // e.g., "136+140" or just the single itag
  combinedFilesize: number; // sum when composed, or single filesize
  audioFormatId?: string; // when pairing separate audio
  audioFilesize?: number; // when pairing separate audio
  formatType?: FormatType; // used by getAllFormats
}

// A processed format row used by helperFunctions when composing/augmenting
export type ProcessedFormat = YtDlpFormat & CombinedFormatExtras;

// Format processing preferences
export type FormatPreference = "smallest" | "universal" | "general" | "all";

// Codec filter options
export interface CodecFilters {
  video?: string;
  audio?: string;
}

// ================= API Response Types =================

// Response structure for format requests
export interface FormatResponse {
  status: "success" | "error";
  value: ProcessedFormat[];
  error?: string;
}

// Response structure for playlist format requests
export interface PlaylistFormatResponse {
  status: "fulfilled" | "rejected";
  value?: ProcessedFormat[];
  reason?: string;
}