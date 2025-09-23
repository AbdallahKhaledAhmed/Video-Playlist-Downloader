import { YtDlpFormat, PlaylistVideoLink } from "../types/wrapperTypes";
import {
  ProcessedFormat,
  FormatType,
  CodecFilters,
} from "../types/helperTypes";
import Wrapper from "./dlpWrapper";
import * as readline from "readline";
import { ProgressBar } from "../main";

//====================== Playlist Downloading =======================
function downloadPlaylist(
  dlp: Wrapper,
  linksArray: YtDlpFormat[],
  playlistName?: string,
  channelName?: string
): void {
  linksArray.forEach((link) => {
    dlp.downloadVideosByFormatId(
      link.url,
      link.format_id,
      `./downloads${
        playlistName
          ? `/${playlistName + channelName ? `(${channelName})` : ""}`
          : ""
      }`
    );
  });
}

// ======================== Format Processing ========================

export class Formats {
  private formatsJson: YtDlpFormat[];

  constructor(formatsJson: YtDlpFormat[]) {
    this.formatsJson = formatsJson;
  }

  // Get video-only formats
  getOnlyVideo(codecFilter?: string): YtDlpFormat[] {
    return this.formatsJson.filter((format: YtDlpFormat) => {
      const hasCorrectCodec = codecFilter
        ? format.vcodec && format.vcodec.startsWith(codecFilter)
        : format.vcodec && format.vcodec !== "none";

      return (
        hasCorrectCodec &&
        format.height && // Must have height (actual video)
        (!format.acodec || format.acodec === "none") // Video only
      );
    });
  }

  // Get audio-only formats
  getOnlyAudio(codecFilter?: string): YtDlpFormat[] {
    return this.formatsJson.filter((format: YtDlpFormat) => {
      const hasCorrectCodec = codecFilter
        ? format.acodec && format.acodec.startsWith(codecFilter)
        : format.acodec && format.acodec !== "none";

      return (
        hasCorrectCodec && (!format.vcodec || format.vcodec === "none") // Audio only
      );
    });
  }

  // Helper function to get combined formats
  getCombinedFormats(
    videoCodecFilter?: string,
    audioCodecFilter?: string
  ): YtDlpFormat[] {
    return this.formatsJson.filter((format: YtDlpFormat) => {
      const hasCorrectVideoCodec = videoCodecFilter
        ? format.vcodec && format.vcodec.startsWith(videoCodecFilter)
        : format.vcodec && format.vcodec !== "none";

      const hasCorrectAudioCodec = audioCodecFilter
        ? format.acodec && format.acodec.startsWith(audioCodecFilter)
        : format.acodec && format.acodec !== "none";

      return (
        hasCorrectVideoCodec && hasCorrectAudioCodec && format.height // Must have height (actual video)
      );
    });
  }

  getSmallestFormats(): ProcessedFormat[] {
    const formats: ProcessedFormat[] = [];

    // Get all combined formats (already have both audio and video)
    const combinedFormats = this.getCombinedFormats().filter(
      (format) => format.filesize
    );

    // Add combined formats
    combinedFormats.forEach((format: YtDlpFormat) => {
      formats.push({
        ...format,
        isCombined: true,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
        formatType: "combined",
      });
    });

    // Get all video-only formats (with filesize for sorting)
    const videoFormats = this.getOnlyVideo().filter(
      (format) => format.filesize
    );

    // Get all audio-only formats and find the smallest one
    const audioFormats = this.getOnlyAudio();
    const smallestAudioFormat = audioFormats.sort(
      (a: YtDlpFormat, b: YtDlpFormat) => (a.filesize || 0) - (b.filesize || 0)
    )[0];

    // Add video+audio combinations if we have separate streams
    if (smallestAudioFormat && videoFormats.length > 0) {
      videoFormats.forEach((video: YtDlpFormat) => {
        formats.push({
          ...video,
          acodec: smallestAudioFormat.acodec,
          audioFormatId: smallestAudioFormat.format_id || "140",
          audioFilesize: smallestAudioFormat.filesize || 0,
          isCombined: false,
          combinedFilesize:
            (video.filesize || 0) + (smallestAudioFormat.filesize || 0),
          combinedFormat: `${video.format_id}+${
            smallestAudioFormat.format_id || "140"
          }`,
          formatType: "video-only",
        });
      });
    }

    // Sort by file size (smallest first)
    formats.sort(
      (a: ProcessedFormat, b: ProcessedFormat) =>
        (a.combinedFilesize || 0) - (b.combinedFilesize || 0)
    );

    return formats;
  }

  getGeneralFormats(): ProcessedFormat[] {
    const formats: ProcessedFormat[] = [];

    // Get combined formats (already have both audio and video)
    const combinedFormats = this.getCombinedFormats();

    // Add combined formats to results (no need to merge)
    combinedFormats.forEach((format: YtDlpFormat) => {
      formats.push({
        ...format,
        isCombined: true,
        combinedFormat: format.format_id, // Just use the format ID as-is
        combinedFilesize: format.filesize || 0,
        formatType: "combined",
      });
    });

    // Get video-only and audio-only formats
    const videoFormats = this.getOnlyVideo();
    const audioFormats = this.getOnlyAudio();

    // Get best audio format for combination
    const audioFormat = audioFormats[0]; // Take first available

    // Add video+audio combinations if we have separate streams
    if (audioFormat && videoFormats.length > 0) {
      videoFormats.forEach((video: YtDlpFormat) => {
        formats.push({
          ...video,
          acodec: audioFormat.acodec,
          audioFormatId: audioFormat.format_id || "140",
          audioFilesize: audioFormat.filesize || 0,
          isCombined: false,
          combinedFilesize: (video.filesize || 0) + (audioFormat.filesize || 0),
          combinedFormat: `${video.format_id}+${
            audioFormat.format_id || "140"
          }`,
          formatType: "video-only",
        });
      });
    }

    // Sort by file size (smallest first)
    formats.sort(
      (a: ProcessedFormat, b: ProcessedFormat) =>
        (a.combinedFilesize || 0) - (b.combinedFilesize || 0)
    );

    return formats;
  }

  // Get all formats (video-only + audio-only + combined) - FIXED VERSION
  getAllFormats(): ProcessedFormat[] {
    const videoFormats = this.getOnlyVideo();
    const audioFormats = this.getOnlyAudio();
    const combinedFormats = this.getCombinedFormats();

    const allFormats: ProcessedFormat[] = [];

    // Add video-only formats
    videoFormats.forEach((format) => {
      allFormats.push({
        ...format,
        formatType: "video-only",
        isCombined: false,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
      });
    });

    // Add audio-only formats
    audioFormats.forEach((format) => {
      allFormats.push({
        ...format,
        formatType: "audio-only",
        isCombined: false,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
      });
    });

    // Add combined formats
    combinedFormats.forEach((format) => {
      allFormats.push({
        ...format,
        formatType: "combined",
        isCombined: true,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
      });
    });

    return allFormats;
  }

  getUniversalFormats(): ProcessedFormat[] {
    const formats: ProcessedFormat[] = [];

    // Get combined universal formats (H.264 + AAC)
    const combinedUniversalFormats = this.getCombinedFormats("avc1", "mp4a");

    // Add combined formats to results
    combinedUniversalFormats.forEach((format: YtDlpFormat) => {
      formats.push({
        ...format,
        isCombined: true,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
        formatType: "combined",
      });
    });

    // Get universal video-only formats (H.264/AVC1)
    const universalVideoFormats = this.getOnlyVideo("avc1");

    // Get universal audio format (AAC)
    const universalAudioFormats = this.getOnlyAudio("mp4a");
    const universalAudioFormat = universalAudioFormats[0]; // Take first available

    // Add video+audio combinations if we have separate streams
    if (universalAudioFormat && universalVideoFormats.length > 0) {
      universalVideoFormats.forEach((video: YtDlpFormat) => {
        formats.push({
          ...video,
          acodec: universalAudioFormat.acodec,
          audioFormatId: universalAudioFormat.format_id || "140",
          audioFilesize: universalAudioFormat.filesize || 0,
          isCombined: false,
          combinedFilesize:
            (video.filesize || 0) + (universalAudioFormat.filesize || 0),
          combinedFormat: `${video.format_id}+${
            universalAudioFormat.format_id || "140"
          }`,
          formatType: "video-only",
        });
      });
    }

    // Sort by file size (smallest first)
    formats.sort(
      (a: ProcessedFormat, b: ProcessedFormat) =>
        (a.combinedFilesize || 0) - (b.combinedFilesize || 0)
    );

    return formats;
  }
}

//====================== Interactive Playlist Format Selection =======================

interface VideoFormatInfo {
  video: PlaylistVideoLink;
  availableFormats: ProcessedFormat[];
}

interface FormatSelectionResult {
  selectedFormat: ProcessedFormat;
  videosWithFormat: PlaylistVideoLink[];
  remainingVideos: PlaylistVideoLink[];
}

/**
 * Interactive function that lets user select format for playlist download
 * with fallback options for videos that don't have the selected format
 */
export async function selectPlaylistFormat(
  dlp: Wrapper,
  playlistVideos: PlaylistVideoLink[],
  rl: readline.Interface
): Promise<{ video: PlaylistVideoLink; format: ProcessedFormat }[]> {

  const finalSelections: {
    video: PlaylistVideoLink;
    format: ProcessedFormat;
  }[] = [];
  let remainingVideos = [...playlistVideos];

  console.log(
    `\n[PLAYLIST] Processing playlist with ${playlistVideos.length} videos...\n`
  );

  // Get formats for all videos first
  console.log("[i] Analyzing available formats for all videos...");
  const videoFormats: VideoFormatInfo[] = [];

  for (let i = 0; i < playlistVideos.length; i++) {
    const video = playlistVideos[i];
    try {
      console.log(
        `Analyzing video ${i + 1}/${
          playlistVideos.length
        }: ${video.title.substring(0, 50)}...`
      );
      const formats = await dlp.getVideoOptions(video.url);
      const processedFormats = new Formats(formats).getGeneralFormats();
      videoFormats.push({ video, availableFormats: processedFormats });
    } catch (error) {
      console.warn(`⚠️  Could not get formats for video: ${video.title}`);
      console.warn(`Error: ${error}`);
    }
  }

  console.log(`\n[OK] Successfully analyzed ${videoFormats.length} videos\n`);

  while (remainingVideos.length > 0) {
    console.log(`\n📊 ${remainingVideos.length} videos remaining to process`);

    // Get all unique formats available across remaining videos
    const allAvailableFormats = getAllUniqueFormats(
      videoFormats.filter((vf) =>
        remainingVideos.some((rv) => rv.id === vf.video.id)
      )
    );

    if (allAvailableFormats.length === 0) {
      console.log("[ERROR] No formats available for remaining videos.");
      break;
    }

    // Display format options with total playlist size
    console.log("\n[>] Available formats:");
    allAvailableFormats.forEach((format, index) => {
      const videoCount = countVideosWithFormat(
        videoFormats,
        format.combinedFormat,
        remainingVideos
      );
      const totalSize = calculateTotalPlaylistSize(
        videoFormats,
        format.combinedFormat,
        remainingVideos
      );
      console.log(
        `${index + 1}. ${formatToStringWithPlaylistSize(
          format,
          totalSize
        )} - Available in ${videoCount}/${remainingVideos.length} videos`
      );
    });

    // Get user selection
    const selectedIndex = await getUserChoice(rl, allAvailableFormats.length);
    const selectedFormat = allAvailableFormats[selectedIndex];

    // Find videos that have this format
    const result = getVideosWithFormat(
      videoFormats,
      selectedFormat,
      remainingVideos
    );

    console.log(
      `\n[OK] Selected format will be used for ${result.videosWithFormat.length} videos`
    );

    // Add selections for videos with this format
    result.videosWithFormat.forEach((video) => {
      finalSelections.push({ video, format: selectedFormat });
    });

    // Update remaining videos
    remainingVideos = result.remainingVideos;

    if (remainingVideos.length > 0) {
      console.log(
        `\n⏭️  ${remainingVideos.length} videos don't have this format. Please select another format for them.`
      );
    }
  }

  console.log(
    `\n🎉 Format selection complete! ${finalSelections.length} videos ready for download.`
  );
  return finalSelections;
}

// Function to create a progress bar
function createProgressBar(percentage: number, width: number = 30): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percentage.toFixed(
    1
  )}%`;
}

/**
 * Downloads playlist with user-selected formats
 */
export async function downloadPlaylistWithFormatSelection(
  dlp: Wrapper,
  playlistVideos: PlaylistVideoLink[],
  playlistName?: string,
  channelName?: string,
  progressBar?: ProgressBar,
  rl?: readline.Interface
): Promise<void> {
  if (!rl) {
    throw new Error("Readline interface is required for playlist format selection");
  }
  const selections = await selectPlaylistFormat(dlp, playlistVideos, rl);

  console.log("\n=== Starting downloads...\n");

  for (let i = 0; i < selections.length; i++) {
    const { video, format } = selections[i];
    console.log(
      `\n[DOWNLOAD] [${i + 1}/${selections.length}] Starting: ${video.title}`
    );

    try {
      // Download with progress tracking
      await new Promise<void>((resolve, reject) => {
        let downloadCompleted = false;
        let lastPercentage = -1;

        dlp
          .downloadVideosByFormatId(
            video.url,
            format.combinedFormat,
            `./downloads${
              playlistName
                ? `/${playlistName}${channelName ? ` (${channelName})` : ""}`
                : ""
            }`,
            video.ind,
            (progress) => {
              if (
                progress.type === "progress" &&
                progress.percentage !== undefined
              ) {
                const currentPercentage = Math.floor(progress.percentage);
                
                if (currentPercentage !== lastPercentage || progress.percentage >= 100) {
                  lastPercentage = currentPercentage;
                  
                  const progressBarStr = createProgressBar(progress.percentage);
                  const speed = progress.speed ? ` | ${progress.speed}` : "";
                  const eta = progress.eta ? ` | ETA: ${progress.eta}` : "";
                  const size = progress.size ? ` | ${progress.size}` : "";

                  // Truncate filename if too long
                  const displayName = video.title.length > 35 
                    ? video.title.substring(0, 32) + "..." 
                    : video.title;

                  if (progressBar) {
                    progressBar.update(
                      `[DOWNLOAD] [${i + 1}/${selections.length}] ${displayName} ${progressBarStr}${speed}${eta}${size}`
                    );
                  } else {
                    // Fallback to simple output
                    process.stdout.write(`\r${progressBarStr}${speed}${eta}${size}`);
                  }
                }
              } else if (progress.type === "complete") {
                downloadCompleted = true;
                if (progressBar) {
                  progressBar.forceUpdate(`[DOWNLOAD] [${i + 1}/${selections.length}] ${video.title} [█████████████████████████] 100.0% | Complete!`);
                  setTimeout(() => {
                    progressBar.done();
                    console.log(`[OK] [${i + 1}/${selections.length}] Completed: ${video.title}`);
                    resolve();
                  }, 500);
                } else {
                  process.stdout.write("\n");
                  console.log(`[OK] [${i + 1}/${selections.length}] Completed: ${video.title}`);
                  resolve();
                }
              } else if (progress.type === "error") {
                downloadCompleted = true;
                if (progressBar) {
                  progressBar.done();
                } else {
                  process.stdout.write("\n");
                }
                console.log(`[ERROR] [${i + 1}/${selections.length}] Failed: ${video.title}`);
                reject(new Error(progress.message || "Download failed"));
              }
            }
          )
          .then(() => {
            if (!downloadCompleted) {
              downloadCompleted = true;
              if (progressBar) {
                progressBar.forceUpdate(`[DOWNLOAD] [${i + 1}/${selections.length}] ${video.title} [█████████████████████████] 100.0% | Complete!`);
                setTimeout(() => {
                  progressBar.done();
                  console.log(`[OK] [${i + 1}/${selections.length}] Completed: ${video.title}`);
                  resolve();
                }, 500);
              } else {
                process.stdout.write("\n");
                console.log(`[OK] [${i + 1}/${selections.length}] Completed: ${video.title}`);
                resolve();
              }
            }
          })
          .catch((error) => {
            if (!downloadCompleted) {
              downloadCompleted = true;
              if (progressBar) {
                progressBar.done();
              } else {
                process.stdout.write("\n");
              }
              console.log(`[ERROR] [${i + 1}/${selections.length}] Failed: ${video.title}`);
              reject(error);
            }
          });
      });
    } catch (error) {
      console.error(`[ERROR] Error downloading ${video.title}: ${error}`);
      // Continue with next video instead of stopping the entire playlist
    }
  }

  console.log("\n🎉 Playlist download complete!");
}

// Helper functions

function getAllUniqueFormats(
  videoFormats: VideoFormatInfo[]
): ProcessedFormat[] {
  const formatMap = new Map<string, ProcessedFormat>();

  videoFormats.forEach(({ availableFormats }) => {
    availableFormats.forEach((format) => {
      if (!formatMap.has(format.combinedFormat)) {
        formatMap.set(format.combinedFormat, format);
      }
    });
  });

  return Array.from(formatMap.values()).sort((a, b) => {
    // Sort by total playlist size (ascending - smallest first)
    const aTotalSize = calculateTotalPlaylistSize(
      videoFormats,
      a.combinedFormat,
      videoFormats.map((vf) => vf.video)
    );
    const bTotalSize = calculateTotalPlaylistSize(
      videoFormats,
      b.combinedFormat,
      videoFormats.map((vf) => vf.video)
    );

    // Primary sort: by total playlist size (smallest first)
    if (aTotalSize !== bTotalSize) {
      return aTotalSize - bTotalSize;
    }

    // Secondary sort: by quality (highest first) if sizes are equal
    if (a.height && b.height && a.height !== b.height) {
      return b.height - a.height;
    }

    // Tertiary sort: by individual file size (smallest first) if quality is equal
    return (a.combinedFilesize || 0) - (b.combinedFilesize || 0);
  });
}

function countVideosWithFormat(
  videoFormats: VideoFormatInfo[],
  formatId: string,
  targetVideos: PlaylistVideoLink[]
): number {
  return videoFormats.filter(
    (vf) =>
      targetVideos.some((tv) => tv.id === vf.video.id) &&
      vf.availableFormats.some((f) => f.combinedFormat === formatId)
  ).length;
}

function getVideosWithFormat(
  videoFormats: VideoFormatInfo[],
  selectedFormat: ProcessedFormat,
  targetVideos: PlaylistVideoLink[]
): FormatSelectionResult {
  const videosWithFormat: PlaylistVideoLink[] = [];
  const remainingVideos: PlaylistVideoLink[] = [];

  targetVideos.forEach((video) => {
    const videoFormatInfo = videoFormats.find((vf) => vf.video.id === video.id);
    if (
      videoFormatInfo &&
      videoFormatInfo.availableFormats.some(
        (f) => f.combinedFormat === selectedFormat.combinedFormat
      )
    ) {
      videosWithFormat.push(video);
    } else {
      remainingVideos.push(video);
    }
  });

  return {
    selectedFormat,
    videosWithFormat,
    remainingVideos,
  };
}

// Calculate total size for all videos that support a specific format
function calculateTotalPlaylistSize(
  videoFormats: VideoFormatInfo[],
  formatId: string,
  targetVideos: PlaylistVideoLink[]
): number {
  let totalSize = 0;

  videoFormats.forEach((vf) => {
    // Check if this video is in our target list and has the format
    if (targetVideos.some((tv) => tv.id === vf.video.id)) {
      const matchingFormat = vf.availableFormats.find(
        (f) => f.combinedFormat === formatId
      );
      if (matchingFormat && matchingFormat.combinedFilesize) {
        totalSize += matchingFormat.combinedFilesize;
      }
    }
  });

  return totalSize;
}

// Format string with total playlist size
function formatToStringWithPlaylistSize(
  format: ProcessedFormat,
  totalPlaylistSize: number
): string {
  const resolution = format.height ? `${format.height}p` : "Audio";
  const codec =
    format.vcodec && format.vcodec !== "none"
      ? format.vcodec.split(".")[0]
      : "";
  const audioCodec =
    format.acodec && format.acodec !== "none"
      ? format.acodec.split(".")[0]
      : "";

  // Format total playlist size
  let playlistSizeStr = "";
  if (totalPlaylistSize > 0) {
    const sizeInMB = totalPlaylistSize / 1024 / 1024;
    if (sizeInMB >= 1024) {
      const sizeInGB = sizeInMB / 1024;
      playlistSizeStr = `~${sizeInGB.toFixed(1)}GB`;
    } else {
      playlistSizeStr = `~${Math.round(sizeInMB)}MB`;
    }
  }

  let description = `${resolution}`;
  if (codec) description += ` (${codec}`;
  if (audioCodec && codec) description += `+${audioCodec}`;
  else if (audioCodec) description += ` (${audioCodec}`;
  if (codec || audioCodec) description += ")";
  if (playlistSizeStr) description += ` ${playlistSizeStr}`;

  return description;
}

// Keep original function for single video use
function formatToString(format: ProcessedFormat): string {
  const resolution = format.height ? `${format.height}p` : "Audio";
  const codec =
    format.vcodec && format.vcodec !== "none"
      ? format.vcodec.split(".")[0]
      : "";
  const audioCodec =
    format.acodec && format.acodec !== "none"
      ? format.acodec.split(".")[0]
      : "";
  const size = format.combinedFilesize
    ? `~${Math.round(format.combinedFilesize / 1024 / 1024)}MB`
    : "";

  let description = `${resolution}`;
  if (codec) description += ` (${codec}`;
  if (audioCodec && codec) description += `+${audioCodec}`;
  else if (audioCodec) description += ` (${audioCodec}`;
  if (codec || audioCodec) description += ")";
  if (size) description += ` ${size}`;

  return description;
}

function getUserChoice(
  rl: readline.Interface,
  maxOptions: number
): Promise<number> {
  return new Promise((resolve) => {
    const askForChoice = () => {
      rl.question(`\nSelect format (1-${maxOptions}): `, (answer) => {
        const trimmedAnswer = answer.trim();
        const choice = parseInt(trimmedAnswer);
        if (isNaN(choice) || choice < 1 || choice > maxOptions) {
          console.log(
            `[ERROR] Please enter a number between 1 and ${maxOptions}`
          );
          askForChoice();
        } else {
          resolve(choice - 1); // Convert to 0-based index
        }
      });
    };
    askForChoice();
  });
}
