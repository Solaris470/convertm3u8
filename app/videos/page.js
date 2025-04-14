"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch("/api/list-videos");
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setVideos(data.videos);
      } catch (err) {
        console.error("Failed to fetch videos:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Video Library</h1>
          <Link 
            href="/"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Convert New Video
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">Error loading videos</h3>
            <p>{error}</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">No videos found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't converted any videos yet. Convert your first video to get started.
            </p>
            <Link 
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors inline-block"
            >
              Convert a Video
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div 
                key={video.id} 
                className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="bg-gray-200 dark:bg-gray-700 h-40 flex items-center justify-center">
                  <svg 
                    className="w-16 h-16 text-gray-400 dark:text-gray-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  </svg>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2 truncate">
                    {video.name || video.id}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Converted: {new Date(video.createdAt).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Link 
                      href={`/player?url=${encodeURIComponent(video.path)}`}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-center text-sm transition-colors"
                    >
                      Play Video
                    </Link>
                    {video.hasMp4 && (
                      <Link 
                        href={`/player?url=${encodeURIComponent(video.path)}&direct=true`}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-center text-sm transition-colors"
                      >
                        Play MP4
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${video.path}`);
                        alert("URL copied to clipboard!");
                      }}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded text-sm transition-colors"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 