import { spawn } from "node:child_process";
import fs from "node:fs";

export default class Wrapper {
  path: string;
  YTDLP: ReturnType<typeof spawn> | null;

  constructor(path: string) {
    this.path = path || "yt-dlp.exe";
    this.YTDLP = null;
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
        this.downloadLatestRelease(latest);
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
}
