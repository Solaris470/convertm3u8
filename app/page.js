"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";

export default function Home() {
  const [file, setFile] = useState(null);
  const [converting, setConverting] = useState(false);
  const [m3u8Url, setM3u8Url] = useState("");
  const [mp4Url, setMp4Url] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile.type.startsWith("video/")) {
        toast.error("Please upload a video file");
        return;
      }
      setFile(selectedFile);
      setError("");
      toast.success(`File "${selectedFile.name}" selected`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv"]
    },
    maxFiles: 1
  });

  const handleConvert = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setConverting(true);
      setM3u8Url("");
      setMp4Url("");
      setUploadProgress(0);
      setError("");
      
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.onload = function() {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setM3u8Url(response.url);
          setMp4Url(response.mp4Url || "");
          toast.success("Conversion successful!");
        } else {
          const errorData = JSON.parse(xhr.responseText);
          const errorMessage = errorData.error || "Conversion failed";
          
          // Check for FFmpeg-specific errors
          if (errorMessage.includes("FFmpeg is not installed")) {
            setError("FFmpeg is not installed or not in your system PATH. Please install FFmpeg as instructed in the README.");
            toast.error("FFmpeg not found");
          } else {
            setError(errorMessage);
            toast.error(errorMessage);
          }
        }
        setConverting(false);
      };

      xhr.onerror = function() {
        setError("Network error occurred");
        toast.error("Network error occurred");
        setConverting(false);
      };

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
      
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Conversion failed");
      toast.error("Conversion failed");
      setConverting(false);
    }
  };

  const copyToClipboard = () => {
    if (m3u8Url) {
      navigator.clipboard.writeText(m3u8Url)
        .then(() => toast.success("URL copied to clipboard!"))
        .catch(() => toast.error("Failed to copy URL"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-10 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">MP4 to M3U8 Converter</h1>
          <a
            href="/videos"
            className="text-blue-500 hover:text-blue-700 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Video Library
          </a>
        </div>
        
        <div className="mb-8">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
            }`}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center justify-center gap-4">
              <svg 
                className="w-12 h-12 text-gray-400 dark:text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              
              {isDragActive ? (
                <p className="text-blue-500 dark:text-blue-400 font-medium">Drop your video here ...</p>
              ) : (
                <div>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Drag & drop a video file here, or <span className="text-blue-500">browse</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supports MP4, MOV, AVI, MKV
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {file && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-800 dark:text-white truncate">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            <h3 className="font-medium mb-2">Error</h3>
            <p>{error}</p>
            {error.includes("FFmpeg") && (
              <div className="mt-3 text-sm">
                <p className="font-medium">How to install FFmpeg:</p>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                  <li>Download from <a href="https://www.gyan.dev/ffmpeg/builds/" target="_blank" rel="noopener noreferrer" className="underline">ffmpeg.org</a></li>
                  <li>Extract the archive to a folder (e.g., C:\FFmpeg)</li>
                  <li>Add the bin folder to your system PATH</li>
                  <li>Restart your computer</li>
                </ol>
              </div>
            )}
          </div>
        )}
        
        {converting ? (
          <div className="mb-8">
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-center mt-2 text-gray-600 dark:text-gray-300">
              {uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : "Converting video..."}
            </p>
          </div>
        ) : (
          <button
            onClick={handleConvert}
            disabled={!file}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              file 
                ? "bg-blue-500 hover:bg-blue-600 text-white" 
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            Convert to M3U8
          </button>
        )}
        
        {m3u8Url && (
          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <h3 className="font-medium text-green-700 dark:text-green-400 mb-2">Conversion Complete!</h3>
            
            <div className="flex items-center mt-3">
              <input
                type="text"
                readOnly
                value={m3u8Url}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-l-lg focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-r-lg transition-colors"
              >
                Copy
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
              You can use this URL in any website that supports HLS streaming.
            </p>
            
            <a 
              href={`/player?url=${encodeURIComponent(m3u8Url.split('/').slice(3).join('/'))}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full mt-4 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-lg transition-colors"
            >
              Open in Video Player
            </a>
            
            <div className="flex gap-2 mt-2">
              <a 
                href={`/player?url=${encodeURIComponent(m3u8Url.split('/').slice(3).join('/'))}&direct=true`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white text-center rounded-lg transition-colors text-sm"
              >
                Open as MP4 (Faster)
              </a>
              <a 
                href="/videos"
                className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white text-center rounded-lg transition-colors text-sm"
              >
                View All Videos
              </a>
            </div>
            
            {mp4Url && (
              <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Direct MP4 link (Fallback):</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={mp4Url}
                    className="flex-1 p-2 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-l-lg focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(mp4Url)
                        .then(() => toast.success("MP4 URL copied!"))
                        .catch(() => toast.error("Failed to copy URL"));
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-r-lg transition-colors text-xs"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Use this URL for browsers that don't support HLS streaming.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
