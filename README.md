# MP4 to M3U8 Converter

A web application to upload MP4 video files, convert them to M3U8 (HLS) format, and generate shareable URLs that can be used in other websites.

## Prerequisites

Before running this application, you need to have the following installed:

1. [Node.js](https://nodejs.org/) (v16 or newer)
2. [FFmpeg](https://ffmpeg.org/download.html) - Must be installed and available in your system PATH

### Installing FFmpeg

#### Windows:
1. Download the FFmpeg build from [FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/)
2. Extract the zip file
3. Add the bin folder to your system PATH

#### macOS:
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install ffmpeg
```

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```bash
   cd convertm3u8
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Drag and drop interface for uploading video files
- Supports MP4, MOV, AVI, and MKV files
- Converts videos to M3U8 (HLS) format for better streaming
- Shows upload and conversion progress
- Automatically generates a shareable URL
- One-click copy to clipboard functionality

## Production Deployment

To build and run the application for production:

```bash
npm run build
npm start
```

## Environment Variables

You can configure the application using the following environment variables:

- `NEXT_PUBLIC_BASE_URL`: The base URL of your application (for generating absolute URLs)

Create a `.env.local` file in the root directory to set environment variables:

```
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## How it Works

1. The user uploads a video file through the web interface
2. The file is sent to the server via an API endpoint
3. FFmpeg processes the video and converts it to HLS format
4. The application generates a URL that can be used to stream the video
5. The user can copy the URL and use it in other websites

## Notes

- The converted files are stored in the `public/hls` directory
- Original uploaded files are stored in `public/uploads`
- For production deployment, consider using a storage service like AWS S3 or similar
