# 🎥 Video Downloader

A powerful TypeScript-based video downloader with an interactive CLI interface, built on top of `yt-dlp`. Download videos from YouTube, Vimeo, Facebook, Instagram, Twitter, Twitch, SoundCloud, TikTok, and many more platforms with ease!

## ✨ Features

- 🎯 **Smart URL Detection** - Automatically detects single videos, playlists, and playlist URLs with specific video indices
- 🔧 **Interactive Format Selection** - Choose between universal (H.264) and smallest file size options for YouTube videos
- 📊 **Real-time Progress Tracking** - Beautiful progress bars with download speed and ETA
- 🎵 **Auto Audio/Video Merging** - Automatically combines best audio and video streams
- 📁 **Organized Downloads** - Creates organized folder structures for playlists
- 🚀 **Auto-updates** - Automatically checks and updates yt-dlp to the latest version
- 🔄 **Playlist Support** - Interactive format selection for entire playlists with fallback options
- 💾 **Smart File Sizing** - Shows accurate file sizes including combined audio/video
- 🌐 **Multi-platform Support** - Works with 1000+ websites
- ⚡ **Executable Generation** - Build standalone executables for easy distribution

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
   npm run build
   ```

4. **Run the downloader**
   ```bash
   npm start
   ```

### Using Pre-built Executable

If you have the pre-built executable (`video-downloader.exe`):

1. Place the executable in a folder with the `utils` directory containing `yt-dlp.exe` and `ffmpeg.exe`
2. Double-click the executable or run it from command line
3. The application will start with the interactive interface

## 🎮 Usage

### Starting the Application

```bash
npm start
```

The application will:

1. Check yt-dlp version and suggest updates if needed
2. Present an interactive menu for URL input
3. Auto-detect URL type (single video, playlist, or playlist with index)

### URL Detection & Handling

The application intelligently handles different URL types:

#### Single Video URLs

```
https://www.youtube.com/watch?v=example
```

- Directly proceeds to format selection and download

#### Playlist URLs

```
https://www.youtube.com/playlist?list=PLexample
```

- Downloads entire playlist with interactive format selection
- Creates organized folder structure

#### Playlist URLs with Video Index

```
https://www.youtube.com/watch?v=example&list=PLexample&index=5
```

- Offers choice to download single video (#5) or entire playlist
- Extracts clean URLs for either option

### Interactive Format Selection

For YouTube videos, choose your preference:

```
📊 Format Preference:
1. Universal (H.264 - works on all devices)
2. Smallest file size (mixed codecs)

Enter your preference (1 or 2): 1
```

Then select from available quality options:

```
📋 Available formats:

1. 🔹 1080p | 💾 45.32 MB | Combined | Video:avc1 60fps/Audio:mp4a
2. 🔹 720p | 💾 28.15 MB | Combined | Video:avc1 30fps/Audio:mp4a
3. 🔹 480p | 💾 18.90 MB | Needs merge | Video:avc1 30fps/Audio:mp4a

>> Enter the number of your preferred format (1-3): 1
```

### Download Progress

Watch real-time download progress:

```
[DOWNLOAD] Video Title [||||||||||||||||||||....] 67.3% | 2.1MB/s | ETA: 00:15 | 45.32MB
```

### Playlist Processing

For playlists, the application:

1. **Analyzes all videos** - Gets available formats for each video
2. **Interactive selection** - Choose format with playlist-wide size estimates
3. **Fallback handling** - Videos without selected format get alternative options
4. **Organized downloads** - Creates folder: `Playlist Name (Channel)`

Example playlist format selection:

```
📊 Available formats:

1. 720p (avc1+mp4a) ~2.1GB - Available in 15/20 videos
2. 480p (avc1+mp4a) ~1.2GB - Available in 20/20 videos
3. 1080p (avc1+mp4a) ~3.8GB - Available in 12/20 videos

Select format (1-3): 2
```

## 📂 Project Structure

```
Video-Playlist-Downloader/
├── src/
│   ├── main.ts              # Main application entry point
│   ├── Modules/
│   │   ├── dlpWrapper.ts    # yt-dlp wrapper class
│   │   └── helperFunctions.ts # Format processing & playlist handling
│   └── types/
│       ├── wrapperTypes.ts  # yt-dlp format types
│       ├── helperTypes.ts   # Format processing types
│       └── index.ts         # Type exports
├── utils/
│   ├── yt-dlp.exe          # yt-dlp binary (Windows)
│   └── ffmpeg.exe          # FFmpeg binary (Windows)
├── downloads/              # Default download directory
├── dist/                   # Compiled JavaScript files
├── video-downloader.exe    # Pre-built executable
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

### Download Directory Structure

- **Single videos**: `./downloads/Video Title.mp4`
- **Playlists**: `./downloads/Playlist Name (Channel)/[1] Video Title.mp4`

### Format Options

- **Universal (H.264)**: Maximum compatibility across all devices and players
- **Smallest File Size**: Uses various codecs to minimize file size

## 📋 Available Scripts

```bash
# Build the project
npm run build

# Start the application (build + run)
npm start

# Development mode with auto-rebuild
npm run dev

# Clean build directory
npm run clean

# Rebuild from scratch
npm run rebuild

# Build Windows executable
npm run build:exe

# Build executables for all platforms
npm run build:exe-all
```

## 🛠️ Technical Details

- **Language**: TypeScript
- **Runtime**: Node.js
- **Core Dependencies**:
  - `yt-dlp` - Video downloading engine
  - `readline` - Interactive CLI interface
  - `child_process` - Process spawning for yt-dlp
  - `pkg` - Executable generation

### Key Components

- **dlpWrapper.ts**: Handles yt-dlp operations, format processing, and download management
- **helperFunctions.ts**: Format selection logic, playlist processing, and interactive workflows
- **main.ts**: CLI interface, URL analysis, and user interaction flow
- **Auto-updater**: Keeps yt-dlp binary up-to-date automatically

### URL Analysis Features

The application includes sophisticated URL parsing:

- **Playlist detection**: Identifies `list=` parameters
- **Index extraction**: Handles `index=` parameters for specific videos
- **Clean URL generation**: Creates proper playlist and single video URLs
- **User choice handling**: Offers logical options based on URL structure

### Format Processing

Advanced format handling includes:

- **Combined formats**: Single files with audio and video
- **Separate streams**: Video-only + audio-only combination
- **Codec filtering**: Universal (H.264/AAC) vs. optimal size
- **Size calculation**: Accurate file size estimation including merged streams
- **Playlist optimization**: Total size calculation across all videos

## 🚀 Building Executables

Create standalone executables for distribution:

```bash
# Windows only
npm run build:exe

# All platforms (Windows, macOS, Linux)
npm run build:exe-all
```

The executable will be created in the project root and includes all necessary dependencies.

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

### Development Guidelines

- Follow TypeScript best practices
- Add type definitions for new features
- Test with various URL types and formats
- Ensure cross-platform compatibility

## 🐛 Issues & Support

Found a bug or have a feature request? Please [open an issue](https://github.com/AbdallahKhaledAhmed/Video-Playlist-Downloader/issues) on GitHub.

### Common Issues

- **yt-dlp not found**: Ensure `utils/yt-dlp.exe` exists or install yt-dlp globally
- **Download failures**: Check internet connection and video availability
- **Format selection issues**: Some videos may not support all quality options

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The powerful video downloading library that makes this project possible
- [FFmpeg](https://ffmpeg.org/) - For audio/video processing capabilities
- [pkg](https://github.com/vercel/pkg) - For executable generation

---

**⭐ Star this repo if you find it helpful!**

**Made with ❤️ by [AbdallahKhaledAhmed](https://github.com/AbdallahKhaledAhmed)**
