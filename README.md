# 🎥 Video Downloader

A powerful TypeScript-based video downloader with an interactive CLI interface, built on top of `yt-dlp`. Download videos from YouTube, Vimeo, Facebook, Instagram, Twitter, Twitch, SoundCloud, TikTok, and many more platforms with ease!

## ✨ Features

- 🎯 **Interactive CLI Interface** - Easy-to-use command-line interface with real-time progress updates
- 🔧 **Format Selection** - Choose between universal (H.264) and smallest file size options
- 📊 **Real-time Progress** - Beautiful progress bars with download speed and ETA
- 🚀 **Auto-updates** - Automatically checks and updates yt-dlp to the latest version
- 📁 **Custom Download Directory** - Specify your preferred download location
- 🎵 **Audio + Video Merging** - Automatically combines best audio and video streams
- 💾 **Smart File Sizing** - Shows accurate file sizes including combined audio/video
- 🌐 **Multi-platform Support** - Works with 1000+ websites

### Supported Platforms

YouTube, Vimeo, Facebook, Instagram, Twitter, Twitch, SoundCloud, TikTok, Dailymotion, Reddit, and [many more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)!

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **TypeScript** (will be installed with dependencies)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/AbdallahKhaledAhmed/Video-Playlist-Downloader.git
   cd Video-Playlist-Downloader
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npx tsc
   ```

4. **Run the downloader**
   ```bash
   node dist/src/main.js
   ```

## 🎮 Usage

1. **Start the application**

   ```bash
   npm start
   ```

2. **Enter the video URL**

   ```
   🔗 Enter YouTube URL: https://www.youtube.com/watch?v=example
   ```

3. **Choose format preference**

   ```
   📊 Format Preference:
   1. Universal (H.264 - works on all devices)
   2. Smallest file size (mixed codecs)

   Enter your preference (1 or 2): 1
   ```

4. **Select video quality**

   ```
   📋 Available formats:

   1. 📹 1080p | 💾 45.32 MB | 🔧 avc1 60fps
   2. 📹 720p | 💾 28.15 MB | 🔧 avc1 30fps
   3. 📹 480p | 💾 18.90 MB | 🔧 avc1 30fps

   💡 Enter the number of your preferred format (1-3): 1
   ```

5. **Watch the download progress**
   ```
   📥 Downloading: 45.2% ████████████████░░░░░░░░░░░░░░
   💾 Size: 45.32MB | ⚡ Speed: 2.1MB/s | ⏱️ ETA: 00:12
   ```

## 📂 Project Structure

```
Video-Playlist-Downloader/
├── src/
│   ├── main.ts              # Main application entry point
│   └── Modules/
│       └── dlpWrapper.ts    # yt-dlp wrapper class
├── utils/
│   ├── yt-dlp.exe          # yt-dlp binary (Windows)
│   └── ffmpeg.exe          # FFmpeg binary (Windows)
├── downloads/              # Default download directory
├── dist/                   # Compiled JavaScript files
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Custom Download Directory

The application will prompt you to set a custom download directory, or use the default `./downloads` folder.

### Format Options

- **Universal (H.264)**: Best compatibility across all devices and players
- **Smallest File Size**: Uses various codecs to minimize file size

## 📋 Scripts

```bash
# Build the project
npm run build

# Start the application
npm start

# Development mode with auto-rebuild
npm run dev
```

## 🛠️ Technical Details

- **Language**: TypeScript
- **Runtime**: Node.js
- **Core Dependencies**:
  - `yt-dlp` - Video downloading engine
  - `log-update` - Real-time console updates
  - `readline` - Interactive CLI interface

### Key Components

- **dlpWrapper.ts**: Handles yt-dlp operations, format processing, and download management
- **main.ts**: Provides the interactive CLI interface and user experience
- **Auto-updater**: Keeps yt-dlp binary up-to-date automatically

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

## 🐛 Issues & Support

Found a bug or have a feature request? Please [open an issue](https://github.com/AbdallahKhaledAhmed/Video-Playlist-Downloader/issues) on GitHub.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The powerful video downloading library that makes this project possible
- [FFmpeg](https://ffmpeg.org/) - For audio/video processing capabilities

---

**⭐ Star this repo if you find it helpful!**

**Made with ❤️ by [AbdallahKhaledAhmed](https://github.com/AbdallahKhaledAhmed)**
