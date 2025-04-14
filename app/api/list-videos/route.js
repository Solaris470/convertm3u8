import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const hlsDir = path.join(process.cwd(), 'public', 'hls');
    
    // Check if directory exists
    if (!fs.existsSync(hlsDir)) {
      return NextResponse.json({ videos: [] });
    }
    
    // Read all directories in the hls folder
    const entries = fs.readdirSync(hlsDir, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());
    
    // Map directories to video objects
    const videos = directories.map(dir => {
      const id = dir.name;
      const videoDir = path.join(hlsDir, id);
      const m3u8Path = path.join(videoDir, 'playlist.m3u8');
      const mp4Path = path.join(videoDir, 'video.mp4');
      
      // Check if files exist
      const hasM3u8 = fs.existsSync(m3u8Path);
      const hasMp4 = fs.existsSync(mp4Path);
      
      // Get directory stats for creation time
      const stats = fs.statSync(videoDir);
      
      return {
        id,
        path: `/hls/${id}/playlist.m3u8`,
        mp4Path: `/hls/${id}/video.mp4`,
        createdAt: stats.birthtime.getTime(),
        valid: hasM3u8 || hasMp4,
        hasM3u8: hasM3u8,
        hasMp4: hasMp4,
        name: id.includes('-') ? id.split('-').slice(1).join('-') : id
      };
    });
    
    // Filter out invalid videos without any playable files
    const validVideos = videos.filter(video => video.valid);
    
    // Sort videos by creation time (newest first)
    validVideos.sort((a, b) => b.createdAt - a.createdAt);
    
    return NextResponse.json({ videos: validVideos });
    
  } catch (error) {
    console.error('Error listing videos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 