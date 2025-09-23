import Wrapper from "./Modules/dlpWrapper";
import {
  Formats,
  downloadPlaylistWithFormatSelection,
} from "./Modules/helperFunctions";
import readline from "readline";
import fs from "fs";
import path from "path";

declare global {
  namespace NodeJS {
    interface Process {
      pkg?: unknown;
    }
  }
}

// Enhanced progress tracker with better reliability
class ProgressBar {
  private lastLineLength = 0;
  private isActive = false;
  private lastUpdate = 0;
  private updateInterval = 200; // Update every 200ms

  update(message: string) {
    const now = Date.now();
    
    // Throttle updates to prevent spam
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }
    this.lastUpdate = now;

    // Clear the current line completely
    if (this.lastLineLength > 0) {
      process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r");
    }

    // Write the new message
    process.stdout.write(message);
    this.lastLineLength = message.length;
    this.isActive = true;
  }

  clear() {
    if (this.lastLineLength > 0) {
      process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r");
      this.lastLineLength = 0;
    }
    this.isActive = false;
  }

  done() {
    if (this.isActive) {
      process.stdout.write("\n");
      this.lastLineLength = 0;
      this.isActive = false;
    }
  }

  isUpdating(): boolean {
    return this.isActive;
  }

  // Force update regardless of throttle
  forceUpdate(message: string) {
    // Clear the current line completely
    if (this.lastLineLength > 0) {
      process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r");
    }
    process.stdout.write(message);
    this.lastLineLength = message.length;
    this.isActive = true;
  }
}

// Simple spinner class
class Spinner {
  private frames = ["|", "/", "-", "\\"];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;
  private lastLineLength = 0;

  constructor(message: string = "Loading...") {
    this.message = message;
  }

  start() {
    this.interval = setInterval(() => {
      const spinner = this.frames[this.currentFrame];
      const output = `${spinner} ${this.message}`;

      // Clear previous line
      if (this.lastLineLength > 0) {
        process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r");
      }

      // Write new content
      process.stdout.write(output);
      this.lastLineLength = output.length;

      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  stop(finalMessage?: string) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Clear the spinner line
    if (this.lastLineLength > 0) {
      process.stdout.write("\r" + " ".repeat(this.lastLineLength) + "\r");
      this.lastLineLength = 0;
    }

    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  updateMessage(newMessage: string) {
    this.message = newMessage;
  }
}

const progress = new ProgressBar();

// Handle executable vs development environment
function getExecutablePath(): string {
  if (process.pkg) {
    const execDir = path.dirname(process.execPath);
    const ytdlpPath = path.join(execDir, "utils", "yt-dlp.exe");

    if (fs.existsSync(ytdlpPath)) {
      return ytdlpPath;
    }

    const fallbackPath = path.join(execDir, "yt-dlp.exe");
    if (fs.existsSync(fallbackPath)) {
      return fallbackPath;
    }

    return "yt-dlp";
  }

  return "utils/yt-dlp.exe";
}

const dlp = new Wrapper(getExecutablePath());

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`[+] Created directory: ${dirPath}`);
    }
    return true;
  } catch (error) {
    console.error(`[!] Failed to create directory ${dirPath}:`, error);
    return false;
  }
}

interface UrlAnalysis {
  type: "single" | "playlist" | "playlist_with_index";
  hasPlaylist: boolean;
  hasIndex: boolean;
  playlistId?: string;
  videoIndex?: number;
  cleanPlaylistUrl?: string;
  singleVideoUrl?: string;
}

function analyzeUrl(url: string): UrlAnalysis {
  const hasPlaylist = url.includes("list=");
  const hasIndex = url.includes("index=");

  let playlistId: string | undefined;
  let videoIndex: number | undefined;

  if (hasPlaylist) {
    const listMatch = url.match(/[?&]list=([^&]+)/);
    playlistId = listMatch ? listMatch[1] : undefined;
  }

  if (hasIndex) {
    const indexMatch = url.match(/[?&]index=(\d+)/);
    videoIndex = indexMatch ? parseInt(indexMatch[1]) : undefined;
  }

  let cleanPlaylistUrl: string | undefined;
  let singleVideoUrl: string | undefined;

  if (hasPlaylist && playlistId) {
    cleanPlaylistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  }

  if (hasIndex && hasPlaylist) {
    singleVideoUrl = url
      .replace(/[?&]list=[^&]+/, "")
      .replace(/&&/g, "&")
      .replace(/[?&]$/, "");
  }

  let type: "single" | "playlist" | "playlist_with_index";
  if (hasPlaylist && hasIndex) {
    type = "playlist_with_index";
  } else if (hasPlaylist) {
    type = "playlist";
  } else {
    type = "single";
  }

  return {
    type,
    hasPlaylist,
    hasIndex,
    playlistId,
    videoIndex,
    cleanPlaylistUrl,
    singleVideoUrl,
  };
}

async function handleYtDlpUpdate(versionInfo: any): Promise<void> {
  if (versionInfo.status === "outdated") {
    console.log(`[UPDATE] Current version: ${versionInfo.current}`);
    console.log(`[UPDATE] Latest version: ${versionInfo.latest}`);

    const updateChoice = await askQuestion(
      "\n[?] Would you like to update yt-dlp to the latest version? (y/n): "
    );

    if (
      updateChoice.toLowerCase() === "y" ||
      updateChoice.toLowerCase() === "yes"
    ) {
      const spinner = new Spinner("Updating yt-dlp...");

      try {
        spinner.start();
        await dlp.updateToLatestVersion();
        spinner.stop("[SUCCESS] yt-dlp updated successfully!");

        // Verify the update
        console.log("\n[INFO] Verifying update...");
        const newVersionInfo = await dlp.checkVersion();
        console.log(`[OK] yt-dlp is now version: ${newVersionInfo.current}`);
      } catch (error) {
        spinner.stop("[ERROR] Failed to update yt-dlp");
        console.error(
          `[ERROR] Update failed: ${
            error instanceof Error ? error.message : error
          }`
        );

        const continueChoice = await askQuestion(
          "\n[?] Continue with current version anyway? (y/n): "
        );

        if (
          continueChoice.toLowerCase() !== "y" &&
          continueChoice.toLowerCase() !== "yes"
        ) {
          console.log("[EXIT] Exiting application.");
          return;
        }
      }
    } else {
      console.log("[SKIP] Continuing with current version.");
    }
  }
}

async function getUrlAndProcess(): Promise<boolean> {
  const url = await askQuestion(
    "\n>> Enter Video/Playlist URL (or 'quit' to exit): "
  );

  if (!url || url.toLowerCase() === "quit" || url.toLowerCase() === "q") {
    return false;
  }

  const analysis = analyzeUrl(url);
  console.log(`\n[i] URL Analysis: ${analysis.type}`);

  switch (analysis.type) {
    case "single":
      console.log("[VIDEO] Single video detected");
      return await processSingleVideo(url);

    case "playlist":
      console.log("[PLAYLIST] Playlist detected");
      return await processPlaylist(analysis.cleanPlaylistUrl || url);

    case "playlist_with_index":
      console.log(
        `[PLAYLIST] Playlist with specific video (index ${analysis.videoIndex}) detected`
      );
      return await handlePlaylistWithIndex(analysis);

    default:
      console.log("[!] Could not determine URL type");
      return true;
  }
}

async function handlePlaylistWithIndex(
  analysis: UrlAnalysis
): Promise<boolean> {
  console.log(
    `\n[>] This URL contains both a playlist and points to video #${analysis.videoIndex}`
  );
  console.log("[OPTIONS]:");
  console.log(
    `1. Download only video #${analysis.videoIndex} from the playlist`
  );
  console.log("2. Download the entire playlist");
  console.log("3. Go back");

  const choice = await askQuestion("\nWhat would you like to do? (1-3): ");

  switch (choice) {
    case "1":
      console.log(
        `[VIDEO] Downloading single video #${analysis.videoIndex}...`
      );
      if (analysis.singleVideoUrl) {
        return await processSingleVideo(analysis.singleVideoUrl);
      } else {
        console.log("[!] Could not extract single video URL");
        return true;
      }

    case "2":
      console.log("[PLAYLIST] Downloading entire playlist...");
      if (analysis.cleanPlaylistUrl) {
        return await processPlaylist(analysis.cleanPlaylistUrl);
      } else {
        console.log("[!] Could not extract playlist URL");
        return true;
      }

    case "3":
      return true;

    default:
      console.log("[!] Invalid choice. Please try again.");
      return await handlePlaylistWithIndex(analysis);
  }
}

function displayOptions(
  options: any[],
  url: string,
  preference: "universal" | "smallest"
) {
  progress.clear();

  let output = `\n[VIDEO] ${url}\n`;
  output += `[FORMAT] ${
    preference === "universal" ? "Universal (H.264)" : "Smallest File Size"
  }\n`;
  output += `[FORMATS] Available options:\n\n`;

  options.forEach((option, index) => {
    const resolution = option.height ? `${option.height}p` : "Unknown";
    const totalSize = option.combinedFilesize || option.filesize || 0;
    const fileSize =
      totalSize > 0
        ? `${(totalSize / 1024 / 1024).toFixed(2)} MB`
        : "Unknown size";
    const formatType = option.isCombined ? "Combined" : "Needs merge";
    const vcodec = option.vcodec
      ? option.vcodec.split(".")[0]
      : "Unknown codec";
    const acodec = option.acodec
      ? option.acodec.split(".")[0]
      : "Unknown codec";
    const fps = option.fps ? `|${option.fps}fps` : "";

    output += `${
      index + 1
    }. ${resolution} | ${fileSize} | ${formatType} | Video:${vcodec}${fps}/Audio:${acodec}\n`;
  });

  output += `\n>> Enter the number of your preferred format (1-${options.length}): `;
  console.log(output);
}

function createProgressBar(percentage: number, width: number = 25): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percentage.toFixed(1)}%`;
}

function waitForDownloadCompletion(
  dlp: Wrapper,
  url: string,
  formatId: string,
  downloadDir: string,
  videoTitle?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let downloadCompleted = false;
    let currentFilename = videoTitle || "Unknown";
    let lastPercentage = -1;
    let startTime = Date.now();

    // Show initial progress
    progress.forceUpdate(`[DOWNLOAD] ${currentFilename} [░░░░░░░░░░░░░░░░░░░░░░░░░] 0.0% | Starting...`);

    dlp
      .downloadVideosByFormatId(
        url,
        formatId,
        downloadDir,
        undefined,
        (progressInfo) => {
          if (progressInfo.type === "progress") {
            if (progressInfo.filename) {
              // Extract just the filename without extension for display
              const fullPath = progressInfo.filename;
              const basename = path.basename(fullPath);
              // Remove file extension for cleaner display
              const nameWithoutExt = basename.replace(/\.[^/.]+$/, "");
              currentFilename = nameWithoutExt;
            }

            if (progressInfo.percentage !== undefined) {
              const currentPercentage = Math.floor(progressInfo.percentage);
              
              // Update progress with proper throttling
              if (currentPercentage !== lastPercentage || progressInfo.percentage >= 100) {
                lastPercentage = currentPercentage;
                
                const progressBar = createProgressBar(progressInfo.percentage);
                const speed = progressInfo.speed ? ` | ${progressInfo.speed}` : "";
                const eta = progressInfo.eta ? ` | ETA: ${progressInfo.eta}` : "";
                const size = progressInfo.size ? ` | ${progressInfo.size}` : "";

                // Truncate filename if too long
                const displayName = currentFilename.length > 35 
                  ? currentFilename.substring(0, 32) + "..." 
                  : currentFilename;

                // Use regular update with throttling
                progress.update(
                  `[DOWNLOAD] ${displayName} ${progressBar}${speed}${eta}${size}`
                );
              }
            }
          } else if (progressInfo.type === "complete") {
            downloadCompleted = true;
            progress.forceUpdate(`[DOWNLOAD] ${currentFilename} [█████████████████████████] 100.0% | Complete!`);
            setTimeout(() => {
              progress.done();
              console.log(`[OK] Download completed: ${currentFilename}`);
              resolve(true);
            }, 500);
          } else if (progressInfo.type === "error") {
            downloadCompleted = true;
            progress.done();
            console.log(`[ERROR] Download failed: ${progressInfo.message}`);
            setTimeout(() => resolve(false), 100);
          }
        }
      )
      .then(() => {
        if (!downloadCompleted) {
          downloadCompleted = true;
          progress.forceUpdate(`[DOWNLOAD] ${currentFilename} [█████████████████████████] 100.0% | Complete!`);
          setTimeout(() => {
            progress.done();
            console.log(`[OK] Download completed: ${currentFilename}`);
            resolve(true);
          }, 500);
        }
      })
      .catch((error) => {
        if (!downloadCompleted) {
          downloadCompleted = true;
          progress.done();
          console.log(`[ERROR] Download failed: ${error.message}`);
          resolve(false);
        }
      });

    // Fallback timeout
    setTimeout(() => {
      if (!downloadCompleted) {
        downloadCompleted = true;
        progress.done();
        console.log("[TIMEOUT] Download timeout reached. Continuing...");
        resolve(false);
      }
    }, 300000);
  });
}

async function processSingleVideo(url: string): Promise<boolean> {
  try {
    progress.clear();
    let preference: "universal" | "smallest" = "smallest";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      console.log("\n[FORMAT] Preference:");
      console.log("1. Universal (H.264 - works on all devices)");
      console.log("2. Smallest file size (mixed codecs)");

      const preferenceChoice = await askQuestion(
        "\nEnter your preference (1 or 2, or press Enter for smallest): "
      );

      if (preferenceChoice === "1") {
        preference = "universal";
      } else if (preferenceChoice === "2" || preferenceChoice === "") {
        preference = "smallest";
      } else {
        console.log("[!] Invalid choice. Using smallest file size.");
        preference = "smallest";
      }
    }

    console.log("[LOADING] Fetching video formats... Please wait...");

    const rawFormats = await Promise.race([
      dlp.getVideoOptions(url),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Timeout: Request took too long")),
          30000
        );
      }),
    ]);

    if (!rawFormats || rawFormats.length === 0) {
      console.log("[!] No video formats found for this URL.");
      return true;
    }

    const formats = new Formats(rawFormats);
    const processedFormats =
      preference === "universal"
        ? formats.getUniversalFormats()
        : formats.getSmallestFormats();

    if (processedFormats.length === 0) {
      console.log("[!] No suitable formats found for this video.");
      return true;
    }

    displayOptions(processedFormats, url, preference);

    const choice = await askQuestion("");
    const selectedIndex = parseInt(choice) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= processedFormats.length
    ) {
      console.log("[!] Invalid selection. Please try again.");
      return true;
    }

    const selectedFormat = processedFormats[selectedIndex];
    const downloadDir = "./downloads";

    if (!ensureDirectoryExists(downloadDir)) {
      console.log(
        "[!] Failed to create download directory. Continuing with current directory..."
      );
    }

    console.log(
      `[OK] Selected format: ${selectedFormat.height}p (${selectedFormat.combinedFormat})`
    );
    console.log(`[DIR] Download directory: ${path.resolve(downloadDir)}`);
    console.log(`[START] Starting download...`);

    // Get video title before starting download
    let videoTitle: string | undefined;
    try {
      const videoInfo = await dlp.getVideoInfo(url);
      videoTitle = videoInfo.title;
    } catch (error) {
      console.log("[WARNING] Could not get video title, using fallback");
    }

    const success = await waitForDownloadCompletion(
      dlp,
      url,
      selectedFormat.combinedFormat,
      downloadDir,
      videoTitle
    );

    if (success) {
      console.log("\n[SUCCESS] Download completed successfully!");
    } else {
      console.log(
        "\n[WARNING] Download had issues, but you can try another video."
      );
    }

    return true;
  } catch (error) {
    progress.clear();
    console.error("[ERROR]", error);
    console.log("[INFO] You can try again with a different URL.");
    return true;
  }
}

async function processPlaylist(url: string): Promise<boolean> {
  try {
    console.log("\n[LOADING] Getting playlist information...");
    const playlistInfo = await dlp.getPlaylistLinks(url);

    console.log(`\n[PLAYLIST] "${playlistInfo.playlistName}"`);
    console.log(`[CHANNEL] ${playlistInfo.channel}`);
    console.log(`[VIDEOS] ${playlistInfo.videos.length}`);

    const proceed = await askQuestion(
      "\n[?] Proceed with interactive format selection? (y/n): "
    );
    if (proceed.toLowerCase() !== "y" && proceed.toLowerCase() !== "yes") {
      console.log("[CANCELLED] Playlist download cancelled.");
      return true;
    }

    console.log(
      "\n[START] Starting interactive format selection and download..."
    );

    await downloadPlaylistWithFormatSelection(
      dlp,
      playlistInfo.videos,
      playlistInfo.playlistName,
      playlistInfo.channel
    );

    console.log("\n[SUCCESS] Playlist download completed!");
    return true;
  } catch (error) {
    console.error("[ERROR] Error during playlist download:", error);
    console.log("[INFO] You can try again with a different playlist URL.");
    return true;
  }
}

async function main() {
  try {
    console.clear();
    console.log("=== Video Downloader Started ===");
    console.log("[INFO] Auto-detects single videos and playlists");
    console.log("[INFO] Special handling for playlist URLs with video index");

    console.log("\n[LOADING] Checking yt-dlp version...");
    try {
      const versionInfo = await dlp.checkVersion();
      console.log(`[OK] yt-dlp version: ${versionInfo.current}`);

      // Handle potential updates
      await handleYtDlpUpdate(versionInfo);
    } catch (versionError) {
      console.error("[WARNING] Could not check yt-dlp version:", versionError);
      console.log(
        "[INFO] This might indicate yt-dlp is not properly installed or accessible."
      );

      const continueAnyway = await askQuestion(
        "\n[?] Continue anyway? (y/n): "
      );
      if (
        continueAnyway.toLowerCase() !== "y" &&
        continueAnyway.toLowerCase() !== "yes"
      ) {
        console.log("[EXIT] Exiting application.");
        await askQuestion("\n[PAUSE] Press Enter to close...");
        return;
      }
    }

    while (true) {
      try {
        const shouldContinue = await getUrlAndProcess();
        if (!shouldContinue) {
          break;
        }
        console.log("\n" + "=".repeat(50));
      } catch (loopError) {
        console.error("[ERROR] Error in main loop:", loopError);
        console.log("[WARNING] Continuing to next iteration...");
        console.log("\n" + "=".repeat(50));
      }
    }
  } catch (error) {
    progress.clear();
    console.error("[FATAL] Fatal Error:", error);
    console.error(
      "[DEBUG] Error details:",
      error instanceof Error ? error.message : String(error)
    );

    console.log("\n[PAUSE] Press Enter to close the application...");
    await askQuestion("");
  } finally {
    console.log("\n[GOODBYE] Thanks for using Video Downloader!");
    rl.close();
    dlp.cleanup();
  }
}

process.on("SIGINT", () => {
  progress.clear();
  console.log("\n[CANCELLED] Download cancelled by user. Goodbye!");
  rl.close();
  dlp.cleanup();
  process.exit(0);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("[ERROR] Unhandled Promise Rejection:", reason);
  console.error("[DEBUG] Promise:", promise);
  console.log("\n[PAUSE] Press Enter to close the application...");
  try {
    await askQuestion("");
  } catch (e) {
    setTimeout(() => process.exit(1), 3000);
  }
  process.exit(1);
});

process.on("uncaughtException", async (error) => {
  console.error("[ERROR] Uncaught Exception:", error);
  console.error("[DEBUG] Stack trace:", error.stack);
  console.log("\n[PAUSE] Press Enter to close the application...");
  try {
    await askQuestion("");
  } catch (e) {
    setTimeout(() => process.exit(1), 3000);
  }
  process.exit(1);
});

main();
