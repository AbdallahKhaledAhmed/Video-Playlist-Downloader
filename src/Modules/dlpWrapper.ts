import { spawn } from "node:child_process";
import fs from "node:fs";
import { 
  YtDlpFormats, 
  PlaylistLinks, 
  PlaylistVideoLink, 
  VersionCheckResult, 
  DownloadProgress 
} from "../types/wrapperTypes";

export default class Wrapper {
  private path: string;
  private YTDLP: ReturnType<typeof spawn> | null = null;
  private latestVersionTag: string | null = null;
  private getOptions: ReturnType<typeof spawn> | null = null;
  private getPlaylistInfo: ReturnType<typeof spawn> | null = null;
  private download: ReturnType<typeof spawn> | null = null;

  constructor(path: string = "./utils/yt-dlp.exe") {
    this.path = path || "./utils/yt-dlp.exe";
  }

  // ======================== Version Management ========================

  checkVersion(): Promise<VersionCheckResult> {
    return new Promise((resolve, reject) => {
      this.YTDLP = spawn(this.path, ["--version"]);

      this.YTDLP.on("error", (error) => {
        reject(new Error(`YT-DLP not found: ${error.message}`));
      });

      this.YTDLP.stderr?.on("data", (data) => {
        reject(new Error(`YT-DLP error: ${data.toString()}`));
      });

      this.YTDLP.stdout?.on("data", async (data) => {
        try {
          const current = data.toString().trim();
          const latest = await this.getLatestReleaseVersion();

          const result: VersionCheckResult =
            latest === current
              ? { status: "up-to-date", current, latest }
              : latest !== null
              ? { status: "outdated", current, latest }
              : { status: "unknown", current, latest: null };

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async getLatestReleaseVersion(): Promise<string> {
    try {
      const response = await fetch(
        "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest"
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.latestVersionTag = data.tag_name;
      return data.tag_name;
    } catch (error) {
      throw new Error(
        `Failed to fetch latest release: ${(error as Error).message}`
      );
    }
  }

  async downloadLatestRelease(): Promise<string> {
    if (!this.latestVersionTag) {
      this.latestVersionTag = await this.getLatestReleaseVersion();
    }

    try {
      const binaryResponse = await fetch(
        `https://github.com/yt-dlp/yt-dlp/releases/download/${this.latestVersionTag}/yt-dlp.exe`
      );

      if (!binaryResponse.ok) {
        throw new Error(
          `Failed to download release: HTTP ${binaryResponse.status}`
        );
      }

      const binaryBuffer = await binaryResponse.arrayBuffer();
      fs.writeFileSync(this.path, Buffer.from(binaryBuffer));

      return "Download completed successfully";
    } catch (error) {
      throw new Error(`Download failed: ${(error as Error).message}`);
    }
  }

  async updateToLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const updater = spawn(this.path, ["-U"]);

      updater.on("error", (error) => {
        reject(new Error(`Update failed: ${error.message}`));
      });

      updater.stderr?.on("data", (data) => {
        const errorText = data.toString();
        if (!errorText.includes("WARNING")) {
          reject(new Error(`Update stderr: ${errorText}`));
        }
      });

      updater.on("close", (code) => {
        if (code === 0) {
          resolve("Update completed successfully");
        } else {
          reject(new Error(`Update failed with exit code: ${code}`));
        }
      });
    });
  }

  // ======================== Video Operations ========================

  getVideoInfo(url: string): Promise<{ title: string; duration?: number; uploader?: string }> {
    return new Promise((resolve, reject) => {
      const getInfo = spawn(this.path, ["--dump-single-json", url]);

      let videoInfo = "";

      getInfo.stdout?.on("data", (data) => {
        videoInfo += data.toString();
      });

      getInfo.stderr?.on("data", (data) => {
        const errorText = data.toString();
        if (!errorText.includes("ffmpeg") && !errorText.includes("WARNING")) {
          reject(new Error(errorText));
        }
      });

      getInfo.on("error", (error) => {
        reject(new Error(`Failed to get video info: ${error.message}`));
      });

      getInfo.on("close", (code) => {
        if (code === 0) {
          try {
            const jsonData = JSON.parse(videoInfo);
            resolve({
              title: jsonData.title || "Unknown Title",
              duration: jsonData.duration,
              uploader: jsonData.uploader,
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse video info: ${parseError}`));
          }
        } else {
          reject(new Error(`Process exited with code: ${code}`));
        }
      });
    });
  }

  getVideoOptions(url: string): Promise<YtDlpFormats> {
    return new Promise((res, rej) => {
      this.getOptions = spawn(this.path, ["--dump-single-json", url]);

      let allOptions = "";

      this.getOptions.stdout?.on("data", (data) => {
        allOptions += data.toString();
      });

      this.getOptions.stderr?.on("data", (data) => {
        const errorText = data.toString();
        if (!errorText.includes("ffmpeg") && !errorText.includes("WARNING")) {
          rej(new Error(errorText));
        }
      });

      this.getOptions.on("error", (error) => {
        rej(new Error(`Failed to get video options: ${error.message}`));
      });

      this.getOptions.on("close", (code) => {
        if (code === 0) {
          try {
            const jsonData = JSON.parse(allOptions);
            res(jsonData.formats as YtDlpFormats);
          } catch (parseError) {
            rej(new Error(`Failed to parse video options: ${parseError}`));
          }
        } else {
          rej(new Error(`Process exited with code: ${code}`));
        }
      });
    });
  }

  downloadVideosByFormatId(
    url: string,
    formatId: string,
    downloadDir: string = "./downloads",
    ind?: number,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const downloadArgs = [
      "-f",
      formatId,
      url,
      "--merge-output-format",
      "mp4",
      "-c",
      "-o",
      `${downloadDir}/${ind ? `[${ind}] ` : ""}%(title)s.%(ext)s`,
      "--newline", // Forces progress on new lines for easier parsing
    ];

    return new Promise((resolve, reject) => {
      this.download = spawn(this.path, downloadArgs);

      this.download.stdout?.on("data", (data) => {
        if (onProgress) {
          const output = data.toString();
          const progress = this.parseDownloadProgress(output);
          if (progress) {
            onProgress(progress);
          }
        }
      });

      this.download.stderr?.on("data", (data) => {
        const output = data.toString();
        
        // Try to parse as progress first
        if (onProgress) {
          const progress = this.parseDownloadProgress(output);
          if (progress) {
            onProgress(progress);
            return;
          }
        }
        
        // If not progress, handle as error
        if (!output.includes("WARNING") && !output.includes("ffmpeg")) {
          if (onProgress) {
            onProgress({ type: "error", message: output });
          }
          reject(new Error(output));
        }
      });

      this.download.on("error", (error) => {
        reject(new Error(`Download failed: ${error.message}`));
      });

      this.download.on("close", (code) => {
        if (code === 0) {
          if (onProgress) {
            onProgress({ type: "complete", percentage: 100 });
          }
          resolve("Download completed successfully");
        } else {
          reject(new Error(`Download failed with exit code: ${code}`));
        }
      });
    });
  }

  private parseDownloadProgress(output: string): DownloadProgress | null {

    // Parse yt-dlp progress output - improved patterns
    // Example: "[download]  45.2% of 123.45MB at 1.23MB/s ETA 00:45"
    const progressMatch = output.match(
      /\[download\]\s+(\d+\.?\d*)%\s+of\s+([\d.]+\w+)(?:\s+at\s+([\d.]+\w+\/s))?(?:\s+ETA\s+([\d:]+))?/
    );

    if (progressMatch) {
      return {
        type: "progress",
        percentage: parseFloat(progressMatch[1]),
        size: progressMatch[2],
        speed: progressMatch[3],
        eta: progressMatch[4],
      };
    }

    // Parse progress with filename and progress bar
    // Example: "[download] Video Title.f278.webm [||||||||||||||||||||||||||||||] 100.0% | 754.38KiB/s | ETA: 00:0"
    const progressWithFilenameMatch = output.match(
      /\[download\]\s+(.+?)\s+\[[|\-\.]+\]\s+(\d+\.?\d*)%\s+(?:\|\s+([\d.]+\w+\/s))?(?:\s+\|\s+ETA:\s+([\d:]+))?/
    );

    if (progressWithFilenameMatch) {
      return {
        type: "progress",
        filename: progressWithFilenameMatch[1].trim(),
        percentage: parseFloat(progressWithFilenameMatch[2]),
        speed: progressWithFilenameMatch[3],
        eta: progressWithFilenameMatch[4],
      };
    }

    // Parse simple progress with filename
    // Example: "[download] Video Title.f278.webm [||||||||||||||||||||||||||||||] 100.0% | 754.38KiB/s"
    const simpleProgressMatch = output.match(
      /\[download\]\s+(.+?)\s+\[[|\-\.]+\]\s+(\d+\.?\d*)%\s+(?:\|\s+([\d.]+\w+\/s))?/
    );

    if (simpleProgressMatch) {
      return {z
        type: "progress",
        filename: simpleProgressMatch[1].trim(),
        percentage: parseFloat(simpleProgressMatch[2]),
        speed: simpleProgressMatch[3],
      };
    }

    // Parse filename extraction
    const filenameMatch = output.match(/\[download\] Destination: (.+)/);
    if (filenameMatch) {
      return {
        type: "progress",
        filename: filenameMatch[1].trim(),
      };
    }

    // Parse completion message
    const completeMatch = output.match(/\[download\] 100% of (.+)/);
    if (completeMatch) {
      return {
        type: "complete",
        percentage: 100,
      };
    }

    // Parse any line with percentage
    const anyPercentageMatch = output.match(/(\d+\.?\d*)%/);
    if (anyPercentageMatch && output.includes('[download]')) {
      return {
        type: "progress",
        percentage: parseFloat(anyPercentageMatch[1]),
      };
    }

    return null;
  }

  // ======================== Playlist Operations ========================

  getPlaylistLinks(url: string): Promise<PlaylistLinks> {
    return new Promise((resolve, reject) => {
      this.getPlaylistInfo = spawn(this.path, [
        "--dump-single-json",
        "--flat-playlist",
        url,
      ]);

      let allVideos = "";

      this.getPlaylistInfo.stdout?.on("data", (data) => {
        allVideos += data.toString();
      });

      this.getPlaylistInfo.stderr?.on("data", (data) => {
        const errorText = data.toString();
        if (!errorText.includes("ffmpeg") && !errorText.includes("WARNING")) {
          reject(new Error(errorText));
        }
      });

      this.getPlaylistInfo.on("error", (error) => {
        reject(new Error(`Failed to get playlist info: ${error.message}`));
      });

      this.getPlaylistInfo.on("close", (code) => {
        if (code === 0) {
          try {
            const jsonData = JSON.parse(allVideos) as {
              entries?: Omit<PlaylistVideoLink, "ind">[];
              title?: string;
              channel?: string;
            };

            const entries: PlaylistVideoLink[] = (jsonData.entries ?? []).map(
              (entry, index) => ({ ...entry, ind: index + 1 })
            ) as PlaylistVideoLink[];

            const playlistObj: PlaylistLinks = {
              playlistName: jsonData.title || "Unknown Playlist",
              channel: jsonData.channel || "Unknown Channel",
              videos: entries,
            };

            resolve(playlistObj);
          } catch (error) {
            reject(new Error(`Failed to parse playlist JSON: ${error}`));
          }
        } else {
          reject(new Error(`Process exited with code: ${code}`));
        }
      });
    });
  }

  // ======================== Cleanup ========================

  cleanup(): void {
    const processes = [
      this.YTDLP,
      this.getOptions,
      this.getPlaylistInfo,
      this.download,
    ];
    processes.forEach((process) => {
      if (process && !process.killed) {
        process.kill();
      }
    });
  }
}
