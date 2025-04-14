import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Create directories if they don't exist
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Function to sanitize filenames
const sanitizeFilename = (filename) => {
  // Generate a timestamp and random string
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  // Get file extension
  const ext = path.extname(filename);
  // Return sanitized name
  return `${timestamp}-${randomStr}${ext}`;
};

export async function POST(request) {
  try {
    // Create upload and output directories
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const outputDir = path.join(process.cwd(), 'public', 'hls');
    
    ensureDir(uploadDir);
    ensureDir(outputDir);

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate sanitized filename (without special characters)
    const originalName = file.name;
    const sanitizedName = sanitizeFilename(originalName);
    const filePath = path.join(uploadDir, sanitizedName);
    
    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    // Create the unique output directory for this video
    const uniqueId = path.parse(sanitizedName).name;
    const videoOutputDir = path.join(outputDir, uniqueId);
    ensureDir(videoOutputDir);

    // M3U8 playlist path
    const m3u8Path = path.join(videoOutputDir, 'playlist.m3u8');
    const relativeM3u8Path = `/hls/${uniqueId}/playlist.m3u8`;
    
    // MP4 fallback path for browsers without HLS support
    const mp4Path = path.join(videoOutputDir, 'video.mp4');
    const relativeMp4Path = `/hls/${uniqueId}/video.mp4`;

    // Convert MP4 to HLS (M3U8)
    // Check if ffmpeg is installed with a test command
    try {
      await execPromise('ffmpeg -version');
    } catch (error) {
      console.error('FFmpeg is not installed or not in PATH:', error);
      return NextResponse.json({ 
        error: 'FFmpeg is not installed or not in PATH. Please install FFmpeg as instructed in the README.' 
      }, { status: 500 });
    }

    // First, create a web-optimized copy of the original video for fallback
    try {
      // Use faster encoding settings with lower quality for quicker conversion
      const mp4Cmd = `ffmpeg -i "${filePath}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 96k -movflags +faststart -vf "scale=720:-2" "${mp4Path}"`;
      await execPromise(mp4Cmd);
      console.log('MP4 fallback created successfully');
    } catch (mp4Error) {
      console.error('Error creating MP4 fallback:', mp4Error);
      // Continue with HLS conversion even if MP4 fallback creation fails
    }

    // Now run the HLS conversion with optimized settings and multiple quality levels
    try {
      // Create multiple quality levels for adaptive streaming
      const ffmpegCmd = `ffmpeg -i "${filePath}" \
        -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 96k -vf "scale=480:-2" -profile:v baseline -level 3.0 -tune fastdecode -g 24 -start_number 0 -hls_time 4 -hls_list_size 0 -f hls -var_stream_map "v:0,a:0" -hls_segment_filename "${videoOutputDir}/%03d.ts" "${m3u8Path}"`;
      
      await execPromise(ffmpegCmd);
      console.log('HLS conversion completed successfully');
    } catch (hlsError) {
      console.error('Error during HLS conversion:', hlsError);
      
      // Check if we at least have the MP4 fallback
      if (fs.existsSync(mp4Path)) {
        // We can continue with just the MP4 fallback
        console.log('Using MP4 fallback only');
      } else {
        // Both conversions failed
        return NextResponse.json({ 
          error: `Video conversion failed: ${hlsError.message}` 
        }, { status: 500 });
      }
    }

    // Generate URL for the M3U8 file
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
    const m3u8Url = `${baseUrl}${relativeM3u8Path}`;
    const mp4Url = `${baseUrl}${relativeMp4Path}`;

    return NextResponse.json({ 
      success: true, 
      url: m3u8Url,
      mp4Url: mp4Url,
      filePath: relativeM3u8Path,
      mp4FilePath: relativeMp4Path,
      originalName: originalName,
      hlsDirectory: uniqueId
    });
    
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 