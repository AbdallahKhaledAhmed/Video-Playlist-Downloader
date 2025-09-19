import { spawn } from "node:child_process";
import fs from "node:fs";
import logUpdate from "log-update";

type PreferenceType = "universal" | "smallest";

export default class Wrapper {
  private path: string;
  private YTDLP: ReturnType<typeof spawn> | null;
  private getOptions: ReturnType<typeof spawn> | null;
  private download: ReturnType<typeof spawn> | null;

  constructor(path: string) {
    this.path = path || "utils/yt-dlp.exe";
    this.YTDLP = null;
    this.getOptions = null;
    this.download = null;
  }

  // ======================== Version Management ========================

  async checkVersion() {
    return new Promise(async (res, rej) => {
      this.YTDLP = spawn(this.path, ["--version"]);

      this.YTDLP.on("error", async (err) => {
        console.error("Failed to find yt-dlp!:", err.message);
        console.log("Downloading latest version of yt-dlp...");
        const latestVersion = await this.getLatestRelease();
        if (latestVersion) {
          try {
            await this.downloadLatestRelease(latestVersion);
            res("yt-dlp is Downloaded successfully! ✅");
          } catch (err) {
            rej(err);
          }
        }
      });
      this.YTDLP.stdout?.on("data", async (data) => {
        const current: string = data.toString().trim();
        const latest: string | null = await this.getLatestRelease();

        if (latest === current) {
          res("yt-dlp is up to date ✅");
        }

        if (latest !== current && latest !== null) {
          console.log("yt-dlp out dated");
          console.log("Downloading latest version of yt-dlp...");
          const updater = spawn(this.path, ["-U"]);
          updater.on("error", (err) => {
            rej(err.message);
          });
          updater.stderr.on("data", (data) => {
            rej(data);
          });
          updater.on("close", () => {
            res("yt-dlp is Updated successfully! ✅");
          });
        }
      });

      this.YTDLP.stderr?.on("data", (data) => {
        console.error(data.toString().trim());
      });
    });
  }

  private async getLatestRelease(): Promise<string | null> {
    try {
      const response = await fetch(
        "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest"
      );
      const data = await response.json();
      return data.tag_name;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  }

  private async downloadLatestRelease(tagName: string): Promise<void> {
    try {
      const binaryResponse = fetch(
        `https://github.com/yt-dlp/yt-dlp/releases/download/${tagName}/yt-dlp.exe`
      );
      const binaryBuffer = await (await binaryResponse).arrayBuffer();
      fs.writeFileSync(this.path, Buffer.from(binaryBuffer));
      console.log("✅ yt-dlp Downloaded successfully.");
    } catch (error) {
      console.error("Error:", error);
    }
  }

  // ======================== Video Operations ========================

  getVideoOptions(
    url: string,
    preference: PreferenceType = "universal"
  ): Promise<any> {
    return new Promise((res, rej) => {
      this.getOptions = spawn(this.path, ["--dump-single-json", url]);

      let allOptions = "";

      this.getOptions.stdout?.on("data", (data) => {
        allOptions += data.toString();
      });

      this.getOptions.stderr?.on("data", (data) => {
        const err = data.toString().trim();
        if (!err.includes("ffmpeg") && !err.includes("WARNING")) {
          rej(err);
        }
      });

      this.getOptions?.on("error", (error) => {
        rej(error.toString().trim());
      });

      this.getOptions.on("close", () => {
        try {
          const jsonData: any[] = JSON.parse(allOptions);
          let processedFormats;
          if (url.includes("youtube.com") || url.includes("youtu.be")) {
            if (preference === "universal") {
              processedFormats = this.getUniversalFormats(jsonData);
            } else {
              processedFormats = this.getSmallestFormats(jsonData);
            }
          } else {
            processedFormats = this.getGeneralFormats(jsonData);
          }
          res(processedFormats || []);
        } catch (error) {
          rej(`Failed to parse JSON: ${error}`);
        }
      });
    });
  }

  downloadVideoById(url: string, id: string, downloadDir: string = "./"): void {
    const downloadArgs = [
      "-f",
      id,
      url,
      "--merge-output-format",
      "mp4",
      "-o",
      `${downloadDir}/%(title)s.%(ext)s`, // Set output directory and filename pattern
    ];

    this.download = spawn(this.path, downloadArgs);

    this.download.stdout?.on("data", (data) => {
      const output = data.toString().trim();

      // Check if it's a download progress line
      if (output.includes("[download]") && output.includes("%")) {
        // Extract progress info
        const progressMatch = output.match(
          /\[download\]\s+(\d+\.\d+)%\s+of\s+([\d.]+\w+)\s+at\s+([\d.]+\w+\/s|\w+\s+\w+\/s)\s+ETA\s+([\d:]+|\w+)/
        );

        if (progressMatch) {
          const [, percent, total, speed, eta] = progressMatch;
          const progressBar = this.createProgressBar(parseFloat(percent));

          logUpdate(
            `📥 Downloading: ${percent}% ${progressBar}\n💾 Size: ${total} | ⚡ Speed: ${speed} | ⏱️ ETA: ${eta}`
          );
        } else {
          // Fallback for other download messages
          logUpdate(`📥 ${output}`);
        }
      } else {
        // Non-progress messages (like merge info, completion, etc.)
        logUpdate.clear();
        console.log(output);
      }
    });

    this.download.stderr?.on("data", (data) => {
      const error = data.toString().trim();
      if (error && !error.includes("WARNING")) {
        logUpdate.clear();
        console.error(`❌ ${error}`);
      }
    });

    this.download.on("close", (code) => {
      logUpdate.clear();
      if (code === 0) {
        console.log("✅ Download completed successfully!");
      } else {
        console.log(`❌ Download failed with code ${code}`);
      }
    });
  }

  private createProgressBar(percent: number, length: number = 30): string {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  // ======================== Format Processing ========================

  private getGeneralFormats(jsonData: any): any[] {
    const formats: any[] = [];

    // Get combined formats (already have both audio and video)
    const combinedFormats = jsonData.formats.filter((format: any) => {
      return (
        format.vcodec &&
        format.vcodec !== "none" &&
        format.acodec &&
        format.acodec !== "none" &&
        format.height // Must have height (actual video)
      );
    });

    // Add combined formats to results (no need to merge)
    combinedFormats.forEach((format: any) => {
      formats.push({
        ...format,
        isCombined: true,
        combinedFormat: format.format_id, // Just use the format ID as-is
        combinedFilesize: format.filesize || 0,
      });
    });

    // Get video-only formats
    const videoFormats = jsonData.formats.filter((format: any) => {
      return (
        format.vcodec &&
        format.vcodec !== "none" &&
        format.height && // Must have height (actual video)
        (!format.acodec || format.acodec === "none") // Video only
      );
    });

    // Get audio-only format
    const audioFormat = jsonData.formats.find((format: any) => {
      return format.acodec && (!format.vcodec || format.vcodec === "none"); // Audio only
    });

    // Add video+audio combinations if we have separate streams
    if (audioFormat && videoFormats.length > 0) {
      videoFormats.forEach((video: any) => {
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
        });
      });
    }

    // Sort by file size (smallest first)
    formats.sort(
      (a: any, b: any) => (a.combinedFilesize || 0) - (b.combinedFilesize || 0)
    );

    return formats;
  }

  private getUniversalFormats(jsonData: any): any[] {
    const formats: any[] = [];

    // Get combined universal formats (H.264 + AAC)
    const combinedUniversalFormats = jsonData.formats.filter((format: any) => {
      return (
        format.vcodec &&
        format.vcodec.startsWith("avc1") &&
        format.acodec &&
        format.acodec.startsWith("mp4a") &&
        format.height // Must have height (actual video)
      );
    });

    // Add combined formats to results
    combinedUniversalFormats.forEach((format: any) => {
      formats.push({
        ...format,
        isCombined: true,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
      });
    });

    // Get universal video-only formats (H.264/AVC1)
    const universalVideoFormats = jsonData.formats.filter((format: any) => {
      return (
        format.vcodec &&
        format.vcodec.startsWith("avc1") &&
        format.vcodec !== "none" &&
        format.height && // Must have height (actual video)
        (!format.acodec || format.acodec === "none") // Video only
      );
    });

    // Get universal audio format (AAC)
    const universalAudioFormat = jsonData.formats.find((format: any) => {
      return (
        format.acodec &&
        format.acodec.startsWith("mp4a") &&
        (!format.vcodec || format.vcodec === "none") // Audio only
      );
    });

    // Add video+audio combinations if we have separate streams
    if (universalAudioFormat && universalVideoFormats.length > 0) {
      universalVideoFormats.forEach((video: any) => {
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
        });
      });
    }

    // Sort by file size (smallest first)
    formats.sort(
      (a: any, b: any) => (a.combinedFilesize || 0) - (b.combinedFilesize || 0)
    );

    return formats;
  }

  private getSmallestFormats(jsonData: any): any[] {
    const formats: any[] = [];

    // Get all combined formats (already have both audio and video)
    const combinedFormats = jsonData.formats.filter((format: any) => {
      return (
        format.vcodec &&
        format.vcodec !== "none" &&
        format.acodec &&
        format.acodec !== "none" &&
        format.height && // Must have height (actual video)
        format.filesize // Must have filesize for sorting
      );
    });

    // Add combined formats
    combinedFormats.forEach((format: any) => {
      formats.push({
        ...format,
        isCombined: true,
        combinedFormat: format.format_id,
        combinedFilesize: format.filesize || 0,
      });
    });

    // Get all video-only formats
    const videoFormats = jsonData.formats.filter((format: any) => {
      return (
        format.vcodec &&
        format.vcodec !== "none" &&
        format.height && // Must have height (actual video)
        (!format.acodec || format.acodec === "none") && // Video only
        format.filesize // Must have filesize for sorting
      );
    });

    // Get all audio-only formats
    const audioFormats = jsonData.formats.filter((format: any) => {
      return (
        format.acodec &&
        format.acodec !== "none" &&
        (!format.vcodec || format.vcodec === "none") // Audio only
      );
    });

    // Get the smallest audio format
    const smallestAudioFormat = audioFormats.sort(
      (a: any, b: any) => (a.filesize || 0) - (b.filesize || 0)
    )[0];

    // Add video+audio combinations if we have separate streams
    if (smallestAudioFormat && videoFormats.length > 0) {
      videoFormats.forEach((video: any) => {
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
        });
      });
    }

    // Sort by file size (smallest first)
    formats.sort(
      (a: any, b: any) => (a.combinedFilesize || 0) - (b.combinedFilesize || 0)
    );

    return formats;
  }
}
