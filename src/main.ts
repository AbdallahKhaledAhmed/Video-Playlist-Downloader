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

    // Show if it's combined or needs merging
    const formatType = option.isCombined ? "📱 Combined" : "🔗 Needs merge";

    const vcodec = option.vcodec
      ? option.vcodec.split(".")[0]
      : "Unknown codec";
    const acodec = option.acodec
      ? option.acodec.split(".")[0]
      : "Unknown codec";
    const fps = option.fps ? `|${option.fps}fps` : "";

    output += `${
      index + 1
    }. 📹 ${resolution} | 💾 ${fileSize} | ${formatType} | 🔧 Video:${vcodec}${fps}/Audio:${acodec}\n`;
  });

  output += `\n💡 Enter the number of your preferred format (1-${options.length}): `;

  console.log(output); // Use console.log instead of logUpdate for this
}

// Function to wait for download completion
function waitForDownloadCompletion(
  dlp: Wrapper,
  url: string,
  formatId: string,
  downloadDir: string
): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a simple wrapper that monitors the download process
    let downloadCompleted = false;

    // Start the download normally
    dlp.downloadVideoById(url, formatId, downloadDir);

    // Since we can't easily hook into the existing download method,
    // we'll use a simple timeout-based check and assume it completes
    // This is a workaround - ideally the Wrapper class would have events

    // Monitor console output by intercepting console.log temporarily
    const originalConsoleLog = console.log;

    console.log = function (...args: any[]) {
      const message = args.join(" ");

      // Check for completion messages
      if (
        message.includes("Download completed successfully!") ||
        message.includes("✅ Download completed successfully!")
      ) {
        downloadCompleted = true;
        console.log = originalConsoleLog; // Restore original
        originalConsoleLog(...args); // Log the success message
        setTimeout(() => resolve(true), 100); // Small delay to ensure message is shown
        return;
      }

      if (
        message.includes("Download failed") ||
        message.includes("❌ Download failed")
      ) {
        downloadCompleted = true;
        console.log = originalConsoleLog; // Restore original
        originalConsoleLog(...args); // Log the error message
        setTimeout(() => resolve(false), 100);
        return;
      }

      // Call original console.log for other messages
      originalConsoleLog(...args);
    };

    // Fallback timeout in case we miss the completion message
    setTimeout(() => {
      if (!downloadCompleted) {
        console.log = originalConsoleLog; // Restore original
        console.log("⏰ Download timeout reached. Continuing...");
        resolve(false);
      }
    }, 300000); // 5 minute timeout
  });
}

function createProgressBar(percent: number, length: number = 30): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

async function downloadVideo(): Promise<boolean> {
  try {
    // Get URL from user
    const url = await askQuestion("\n🔗 Enter Video URL (or 'quit' to exit): ");

    if (!url || url.toLowerCase() === "quit") {
      return false; // Signal to exit
    }

    // Ask user for preference
    logUpdate.clear();
    let preference: "universal" | "smallest" = "smallest";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      console.log("\n📊 Format Preference:");
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
        console.log("❌ Invalid choice. Using smallest file size.");
        preference = "smallest";
      }
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
      return true; // Continue loop
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
      console.log("❌ Invalid selection. Please try again.");
      return true; // Continue loop
    }

    const selectedFormat = data[selectedIndex];
    const downloadDir = "./downloads";

    // Ensure directory exists
    if (!ensureDirectoryExists(downloadDir)) {
      console.log(
        "❌ Failed to create download directory. Continuing with current directory..."
      );
    }

    // Clear and show download info
    logUpdate.clear();
    console.log(
      `✅ Selected format: ${selectedFormat.height}p (${selectedFormat.combinedFormat})`
    );
    console.log(`📁 Download directory: ${path.resolve(downloadDir)}`);
    console.log(`📥 Starting download...`);

    // Wait for download to complete
    const success = await waitForDownloadCompletion(
      dlp,
      url,
      selectedFormat.combinedFormat,
      downloadDir
    );

    if (success) {
      console.log("\n🎉 Ready for next download!");
    } else {
      console.log("\n⚠️ Download had issues, but you can try another video.");
    }

    return true; // Continue loop
  } catch (error) {
    logUpdate.clear();
    console.error("❌ Error:", error);
    console.log("⚠️ You can try again with a different URL.");
    return true; // Continue loop even on error
  }
}

async function main() {
  try {
    console.clear();
    console.log("🚀 Video Downloader Started!");
    console.log("📝 Type 'quit' at any time to exit");

    // Check version once at startup
    console.log("🔄 Checking yt-dlp version...");
    console.log(await dlp.checkVersion());
    console.log("");

    // Main download loop
    while (true) {
      const shouldContinue = await downloadVideo();
      if (!shouldContinue) {
        break;
      }

      // Add a small separator between downloads
      console.log("\n" + "─".repeat(50));
    }
  } catch (error) {
    logUpdate.clear();
    console.error("❌ Fatal Error:", error);
  } finally {
    console.log("\n👋 Thanks for using Video Downloader!");
    rl.close();
  }
}

// Handle process termination
process.on("SIGINT", () => {
  logUpdate.clear();
  console.log("\n👋 Download cancelled by user. Goodbye!");
  rl.close();
  process.exit(0);
});

main();
