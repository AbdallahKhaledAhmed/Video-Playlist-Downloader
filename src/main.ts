import Wrapper from "./Modules/dlpWrapper";
import logUpdate from "log-update";
import readline from "readline";
import fs from "fs";
import path from "path";

const dlp = new Wrapper("utils/yt-dlp.exe");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Utility function to ask questions
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to ensure directory exists
function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
    return true;
  } catch (error) {
    console.error(`❌ Failed to create directory ${dirPath}:`, error);
    return false;
  }
}

// Function to display options with log-update
function displayOptions(
  options: any[],
  url: string,
  preference: "universal" | "smallest"
) {
  logUpdate.clear(); // Clear any previous output first

  let output = `\n🎥 Video URL: ${url}\n`;
  output += `📊 Format Type: ${
    preference === "universal" ? "Universal (H.264)" : "Smallest File Size"
  }\n`;
  output += `📋 Available formats:\n\n`;

  options.forEach((option, index) => {
    const resolution = option.height ? `${option.height}p` : "Unknown";

    // Use combinedFilesize instead of just video filesize
    const totalSize = option.combinedFilesize || option.filesize || 0;
    const fileSize =
      totalSize > 0
        ? `${(totalSize / 1024 / 1024).toFixed(2)} MB`
        : "Unknown size";

    // Show breakdown if we have both video and audio sizes
    let sizeBreakdown = "";
    // if (option.filesize && option.audioFilesize && option.combinedFilesize) {
    //   const videoMB = (option.filesize / 1024 / 1024).toFixed(2);
    //   const audioMB = (option.audioFilesize / 1024 / 1024).toFixed(2);
    //   sizeBreakdown = ` (${videoMB}MB video + ${audioMB}MB audio)`;
    // }

    const codec = option.vcodec ? option.vcodec.split(".")[0] : "Unknown codec";
    const fps = option.fps ? ` ${option.fps}fps` : "";

    output += `${
      index + 1
    }. 📹 ${resolution} | 💾 ${fileSize}${sizeBreakdown} | 🔧 ${codec}${fps}\n`;
  });

  output += `\n💡 Enter the number of your preferred format (1-${options.length}): `;

  console.log(output); // Use console.log instead of logUpdate for this
}

async function main() {
  try {
    // Clear console and show loading
    console.clear();
    logUpdate("🚀 Starting Video Downloader...\n");

    // Get download directory from user
    const downloadDirInput = null;
    //  await askQuestion(
    //   '\n📁 Enter download directory (press Enter for default "./downloads"): '
    // );
    const downloadDir = downloadDirInput || "./downloads";

    // Ensure the directory exists
    if (!ensureDirectoryExists(downloadDir)) {
      console.log("❌ Failed to create download directory. Exiting...");
      rl.close();
      return;
    }

    // Get URL from user
    const url = await askQuestion("\n🔗 Enter YouTube URL: ");

    if (!url) {
      console.log("❌ No URL provided. Exiting...");
      rl.close();
      return;
    }

    // Ask user for preference
    logUpdate.clear();
    console.log("\n📊 Format Preference:");
    console.log("1. Universal (H.264 - works on all devices)");
    console.log("2. Smallest file size (mixed codecs)");

    const preferenceChoice = await askQuestion(
      "\nEnter your preference (1 or 2): "
    );

    let preference: "universal" | "smallest";
    if (preferenceChoice === "1") {
      preference = "universal";
    } else if (preferenceChoice === "2") {
      preference = "smallest";
    } else {
      console.log("❌ Invalid choice. Using universal format.");
      preference = "universal";
    }

    // Show loading while fetching options
    logUpdate("🔄 Fetching video formats... Please wait...\n");

    // Add timeout and better error handling
    const data: any[] = await Promise.race([
      dlp.getVideoOptions(url, preference),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Timeout: Request took too long")),
          30000
        );
      }),
    ]);

    if (!data || data.length === 0) {
      logUpdate.clear();
      console.log("❌ No video formats found for this URL.");
      rl.close();
      return;
    }

    // Display options
    displayOptions(data, url, preference);

    // Get user selection
    const choice = await askQuestion("");
    const selectedIndex = parseInt(choice) - 1;

    // Validate selection
    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= data.length
    ) {
      logUpdate.clear();
      console.log("❌ Invalid selection. Please run the program again.");
      rl.close();
      return;
    }

    const selectedFormat = data[selectedIndex];

    // Clear and show download info
    logUpdate.clear();
    console.log(
      `✅ Selected format: ${selectedFormat.height}p (${selectedFormat.combinedFormat})`
    );
    console.log(`📁 Download directory: ${path.resolve(downloadDir)}`);
    console.log(`📥 Starting download...`);

    // Start download with specified directory
    dlp.downloadVideoById(url, selectedFormat.combinedFormat, downloadDir);
  } catch (error) {
    logUpdate.clear();
    console.error("❌ Error:", error);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on("SIGINT", () => {
  logUpdate.clear();
  console.log("\n👋 Download cancelled by user.");
  rl.close();
  process.exit(0);
});

main();
