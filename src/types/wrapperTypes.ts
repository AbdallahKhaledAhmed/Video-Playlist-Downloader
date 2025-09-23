// Types for dlpWrapper.ts
// yt-dlp format types and wrapper-specific interfaces

// ================= yt-dlp format types =================

// A single fragment entry present in storyboard formats
export interface YtDlpFragment {
  url: string;
  duration: number;
}

// HTTP headers object commonly present on each format
export interface YtDlpHttpHeaders {
  "User-Agent": string;
  Accept: string;
  "Accept-Language": string;
  "Sec-Fetch-Mode": string;
  // Allow additional headers if yt-dlp includes more in the future
  [header: string]: string;
}

// Downloader options block observed in formats
export interface YtDlpDownloaderOptions {
  http_chunk_size?: number;
  [key: string]: unknown;
}

// Canonical type of a single yt-dlp format row
export interface YtDlpFormat {
  // Core identifiers
  format_id: string;
  format_note?: string;
  ext: string;
  protocol?: string;

  // Codecs (may be "none")
  acodec?: string; // "none" for video-only formats
  vcodec?: string; // "none" for audio-only formats

  // Media URL
  url: string;

  // Dimensions and rate (can be null for audio-only formats)
  width?: number | null;
  height?: number | null;
  fps?: number | null; // sometimes fractional, sometimes null

  // Storyboard-specific fields
  rows?: number; // number of rows per storyboard sheet
  columns?: number; // number of columns per storyboard sheet
  fragments?: YtDlpFragment[]; // storyboard tiles

  // Audio-specific
  asr?: number | null; // audio sample rate (e.g., 44100, 48000) or null
  audio_channels?: number | null;

  // Bitrate/size related
  tbr?: number | null; // total bitrate
  vbr?: number | null; // video bitrate
  abr?: number | null; // audio bitrate
  filesize?: number | null; // bytes
  filesize_approx?: number | null; // bytes

  // Selection and quality metadata
  source_preference?: number;
  quality?: number;
  has_drm?: boolean;

  // Misc metadata
  language?: string | null; // e.g., "ar" or null
  language_preference?: number;
  preference?: number | null;
  dynamic_range?: string | null; // e.g., "SDR"
  container?: string; // e.g., "mp4_dash", "webm_dash"
  available_at?: number; // epoch (seconds)
  downloader_options?: YtDlpDownloaderOptions;

  // Declared extensions per stream component
  audio_ext?: string; // e.g., "m4a", "webm", or "none"
  video_ext?: string; // e.g., "mp4", "webm", or "none"

  // Presentation details
  resolution?: string; // e.g., "640x360" or "audio only"
  aspect_ratio?: number | null; // e.g., 1.78 or null for audio

  // Request headers frequently included
  http_headers?: YtDlpHttpHeaders;

  // Human-readable label composed by yt-dlp
  format?: string; // e.g., "134 - 640x360 (360p)"

  // Future compatibility – yt-dlp can add more keys
  [key: string]: unknown;
}

// Array of formats returned from yt-dlp
export type YtDlpFormats = YtDlpFormat[];

// ================= Playlist links types (from links.json) =================

export interface PlaylistThumbnail {
  url: string;
  height: number;
  width: number;
}

export interface PlaylistVideoLink {
  _type: "url";
  ie_key: string;
  id: string;
  url: string;
  title: string;
  description: string | null;
  duration: number;
  channel_id: string;
  channel: string;
  channel_url: string;
  uploader: string;
  uploader_id: string;
  uploader_url: string;
  thumbnails: PlaylistThumbnail[];
  timestamp: number | null;
  release_timestamp: number | null;
  availability: string | null;
  view_count: number;
  live_status: string | null;
  channel_is_verified: boolean | null;
  __x_forwarded_for_ip: string | null;
  ind: number;
  [key: string]: unknown; // future-proofing for possible additional fields
}

export interface PlaylistLinks {
  playlistName: string;
  channel: string;
  videos: PlaylistVideoLink[];
}

// Convenient minimal shape used in mapping over links in src/test.ts
export type MinimalPlaylistVideo = Pick<PlaylistVideoLink, "url" | "ind">;

// ================= Wrapper-specific types =================

// Version check result
export interface VersionCheckResult {
  status: "up-to-date" | "outdated" | "unknown";
  current: string;
  latest: string | null;
}

// Download progress information
export interface DownloadProgress {
  type: "progress" | "error" | "complete";
  percentage?: number;
  speed?: string;
  eta?: string;
  size?: string;
  filename?: string;
  message?: string;
}