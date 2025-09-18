import { spawn } from "node:child_process";
import fs from "node:fs";
import { json } from "node:stream/consumers";

export default class Wrapper {
  // ======================== Check yt-dlp ========================
  path: string;
  YTDLP: ReturnType<typeof spawn> | null;
  getOptions: ReturnType<typeof spawn> | null;
  download: ReturnType<typeof spawn> | null;

  constructor(path: string) {
    this.path = path || "utils/yt-dlp.exe";
    this.YTDLP = null;
    this.getOptions = null;
    this.download = null;
    this.checkVersion();
  }
  checkVersion() {
    this.YTDLP = spawn(this.path, ["--version"]);
    this.YTDLP.on("error", async (err) => {
      console.error("Failed to find yt-dlp!:", err.message);
      console.log("Downloading latest version of yt-dlp...");
      this.downloadLatestRelease(await this.getLatestRelease());
    });

    this.YTDLP.stdout?.on("data", async (data) => {
      const current: string = data.toString().trim();
      const latest: string | null = await this.getLatestRelease();
      if (latest === current) console.log("yt-dlp is up to date ✅");
      if (latest !== current && latest !== null) {
        console.log("yt-dlp out dated");
        console.log("Downloading latest version of yt-dlp...");
        spawn(this.path, ["-U"]);
      }
    });

    this.YTDLP.stderr?.on("data", (data) => {
      console.error(data.toString().trim());
    });
  }
  async getLatestRelease() {
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
  async downloadLatestRelease(tagName: string) {
    try {
      const binaryResponse = fetch(
        `https://github.com/yt-dlp/yt-dlp/releases/download/${tagName}/yt-dlp.exe`
      );
      const binaryBuffer = await (await binaryResponse).arrayBuffer();
      fs.writeFileSync("yt-dlp.exe", Buffer.from(binaryBuffer));
      console.log("✅ yt-dlp Downloaded successfully.");
    } catch (error) {
      console.error("Error:", error);
    }
  }
  // =================================================================

  // ======================== Download Videos ========================

  // 1- get Video avalable options
  getVideoOptions(url: string): Promise<any> {
    return new Promise((res, rej) => {
      this.getOptions = spawn(this.path, ["--dump-single-json", url]);

      let allOptions = "";

      this.getOptions.stdout?.on("data", (data) => {
        allOptions += data.toString();
      });

      this.getOptions.stderr?.on("data", (data) => {
        const err = data.toString().trim();
        console.error(err);
        if (!err.includes("ffmpeg") && !err.includes("WARNING")) {
          rej(err);
        }
      });

      this.getOptions?.on("error", (data) => {
        rej(data.toString().trim());
      });

      this.getOptions.on("close", () => {
        try {
          const jsonData = JSON.parse(allOptions);

          // Get ALL universal video formats (H.264/AVC1) - video only
          const universalVideoFormats = jsonData.formats.filter(
            (format: any) => {
              return (
                format.vcodec &&
                format.vcodec.startsWith("avc1") &&
                format.vcodec !== "none" &&
                format.height && // Must have height (actual video)
                (!format.acodec || format.acodec === "none")
              ); // Video only
            }
          );

          // Get universal audio format (AAC) - should be 140
          const universalAudioFormat = jsonData.formats.find((format: any) => {
            return (
              format.acodec &&
              format.acodec.startsWith("mp4a") &&
              (!format.vcodec || format.vcodec === "none")
            ); // Audio only
          });

          // Sort by quality (highest to lowest)
          universalVideoFormats.sort(
            (a: any, b: any) => (b.height || 0) - (a.height || 0)
          );

          // Add audio format ID to each video format for easy access
          const videoOptionsWithAudio = universalVideoFormats.map(
            (video: any) => ({
              ...video,
              audioFormatId: universalAudioFormat?.format_id || "140", // Default to 140
              combinedFormat: `${video.format_id}+${
                universalAudioFormat?.format_id || "140"
              }`,
            })
          );

          fs.writeFileSync(
            "./test.json",
            JSON.stringify(videoOptionsWithAudio, null, 2)
          );
          res(videoOptionsWithAudio || []);
        } catch (error) {
          rej(`Failed to parse JSON: ${error}`);
        }
      });
    });
  }
  // 2- download with the selected option id
  downloadVideoById(url: string, id: string) {
    this.download = spawn(this.path, [
      "-f",
      id,
      url,
      "--merge-output-format",
      "mp4",
    ]);
    this.download.stdout?.on("data", async (data) => {
      console.log(data.toString().trim());
    });
    this.download.stderr?.on("data", (data) => {
      console.error(data.toString().trim());
    });
  }
}
