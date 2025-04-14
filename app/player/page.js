"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PlayerContent() {
  const videoRef = useRef(null);
  const searchParams = useSearchParams();
  const [videoSrc, setVideoSrc] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const loadingTimerRef = useRef(null);

  // Function to cancel loading if it takes too long
  const startLoadingTimer = () => {
    // Clear any existing timer
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    // Set a new timer (30 second timeout)
    loadingTimerRef.current = setTimeout(() => {
      setLoadingTimeout(true);
      setError("Video loading timed out. The file might be too large or the server is busy.");
      setIsLoading(false);
    }, 30000);
  };
  
  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  useEffect(() => {
    const loadHls = async () => {
      try {
        setIsLoading(true);
        setLoadingTimeout(false);
        setError("");
        
        // Start the loading timer
        startLoadingTimer();
        
        // Get URL from query parameter or use default
        const urlParam = searchParams.get("url");
        const videoUrl = urlParam || "/hls/1744624790762-ec30f78n/playlist.m3u8";
        
        setVideoSrc(videoUrl);
        
        // Check if we should try mp4 directly
        const tryMp4Direct = searchParams.get("direct") === "true";
        const mp4Url = videoUrl.replace('playlist.m3u8', 'video.mp4');
        
        // Make sure the video URL is accessible
        try {
          // First check if MP4 is directly requested or if HLS URL fails
          if (tryMp4Direct) {
            console.log("Trying direct MP4 as requested");
            const mp4Response = await fetch(mp4Url.startsWith('/') ? mp4Url : `/${mp4Url}`);
            if (mp4Response.ok) {
              if (videoRef.current) {
                console.log("Using direct MP4 by request");
                videoRef.current.src = mp4Url;
                videoRef.current.addEventListener("loadeddata", () => {
                  setIsLoading(false);
                  clearLoadingTimer();
                });
                videoRef.current.addEventListener("error", (e) => {
                  console.error("Video element error:", e);
                  setError(`Video playback error: ${videoRef.current.error?.message || 'Unknown error'}`);
                  setIsLoading(false);
                  clearLoadingTimer();
                });
                return; // Exit early as we're directly using MP4
              }
            }
          }
          
          // Check if the HLS URL is accessible
          const response = await fetch(videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`);
          if (!response.ok) {
            throw new Error(`Video not found: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.error("Error fetching video:", fetchError);
          
          // Try MP4 as fallback if HLS fails
          try {
            const mp4Response = await fetch(mp4Url.startsWith('/') ? mp4Url : `/${mp4Url}`);
            if (mp4Response.ok && videoRef.current) {
              console.log("Using MP4 fallback after HLS fetch failed");
              videoRef.current.src = mp4Url;
              videoRef.current.addEventListener("loadeddata", () => {
                setIsLoading(false);
                clearLoadingTimer();
              });
              return;
            }
          } catch (mp4FetchError) {
            console.error("Both HLS and MP4 fetch failed:", mp4FetchError);
          }
          
          setError(`Video not found or inaccessible. Please check the URL: ${videoUrl}`);
          setIsLoading(false);
          clearLoadingTimer();
          return;
        }

        // Try to dynamically import hls.js
        let Hls;
        try {
          Hls = (await import("hls.js")).default;
        } catch (importError) {
          console.error("Error importing HLS.js:", importError);
          // Continue without Hls.js, will try native support
        }
        
        // Check if HLS.js is available and supported
        if (Hls && Hls.isSupported() && videoRef.current) {
          console.log("Using HLS.js for playback");
          const hls = new Hls({
            capLevelToPlayerSize: true,
            maxLoadingDelay: 2,
            maxBufferLength: 15,
            startLevel: 0, // Start with lowest quality and switch up
            levelLoadingTimeOut: 10000,
            fragLoadingTimeOut: 10000,
            manifestLoadingTimeOut: 10000,
            autoStartLoad: true
          });
          
          // Add event listeners for better loading feedback
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log("HLS manifest parsed, starting playback");
            setIsLoading(false);
            clearLoadingTimer();
            videoRef.current.play().catch(e => {
              console.warn("Auto-play was prevented", e);
            });
          });
          
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log("HLS media attached");
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error("HLS.js error:", event, data);
            if (data.fatal) {
              setError(`Error loading video: ${data.type} - ${data.details}`);
              setIsLoading(false);
              clearLoadingTimer();
              hls.destroy();
              
              // Try MP4 as fallback if HLS fails
              try {
                console.log("Trying MP4 fallback after HLS error");
                videoRef.current.src = mp4Url;
                videoRef.current.addEventListener("loadeddata", () => {
                  setError(""); // Clear error if MP4 loads successfully
                });
                videoRef.current.addEventListener("error", () => {
                  setError("Video cannot be played. Please try a different browser or video file.");
                });
              } catch (fallbackError) {
                console.error("MP4 fallback failed:", fallbackError);
              }
            }
          });
          
          hls.loadSource(videoUrl);
          hls.attachMedia(videoRef.current);
          
          return () => {
            clearLoadingTimer();
            hls.destroy();
          };
        } else if (videoRef.current) {
          console.log("Trying native HLS support");
          // Try native HLS support first
          if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
            console.log("Native HLS support detected");
            // Native HLS support (Safari)
            videoRef.current.src = videoUrl;
            videoRef.current.addEventListener("loadeddata", () => {
              console.log("Video loaded via native HLS");
              setIsLoading(false);
              clearLoadingTimer();
              videoRef.current.play().catch(e => {
                console.warn("Auto-play was prevented", e);
              });
            });
            
            videoRef.current.addEventListener("error", (e) => {
              console.error("Video element error:", e);
              setError(`Video playback error: ${videoRef.current.error?.message || 'Unknown error'}`);
              setIsLoading(false);
              clearLoadingTimer();
              
              // Try MP4 fallback
              try {
                console.log("Trying MP4 fallback after native HLS error");
                videoRef.current.src = mp4Url;
                videoRef.current.addEventListener("loadeddata", () => {
                  setError(""); // Clear error if MP4 loads successfully
                });
              } catch (fallbackError) {
                console.error("MP4 fallback failed:", fallbackError);
              }
            });
          } else {
            // No HLS support, try direct video embedding as fallback
            console.log("No HLS support, using MP4 fallback");
            
            try {
              // Use MP4 directly
              console.log("Using direct MP4 fallback");
              videoRef.current.src = mp4Url;
              videoRef.current.addEventListener("loadeddata", () => {
                console.log("MP4 fallback loaded successfully");
                setIsLoading(false);
                clearLoadingTimer();
                videoRef.current.play().catch(e => {
                  console.warn("Auto-play was prevented", e);
                });
              });
              
              videoRef.current.addEventListener("error", (e) => {
                console.error("MP4 fallback error:", e);
                setError("Your browser does not support HLS playback and the fallback video cannot be loaded.");
                setIsLoading(false);
                clearLoadingTimer();
              });
            } catch (fallbackError) {
              console.error("Fallback error:", fallbackError);
              setError("Your browser does not support HLS playback. Please use Chrome, Firefox, or Safari.");
              setIsLoading(false);
              clearLoadingTimer();
            }
          }
        } else {
          setError("Video player could not be initialized");
          setIsLoading(false);
          clearLoadingTimer();
        }
      } catch (err) {
        console.error("Error in player setup:", err);
        setError(`Failed to load video player: ${err.message}`);
        setIsLoading(false);
        clearLoadingTimer();
      }
    };
    
    if (videoRef.current) {
      loadHls();
    }
    
    // Clean up timer on unmount
    return () => {
      clearLoadingTimer();
    };
  }, [searchParams]);

  // Function to try direct MP4 playback
  const tryDirectMp4 = () => {
    const urlParam = searchParams.get("url");
    const videoUrl = urlParam || "/hls/1744624790762-ec30f78n/playlist.m3u8";
    const mp4Url = videoUrl.replace('playlist.m3u8', 'video.mp4');
    
    if (videoRef.current) {
      setIsLoading(true);
      startLoadingTimer();
      videoRef.current.src = mp4Url;
      videoRef.current.addEventListener("loadeddata", () => {
        setIsLoading(false);
        setError("");
        clearLoadingTimer();
      });
      videoRef.current.addEventListener("error", () => {
        setError("Could not load MP4 version. The file might not exist.");
        setIsLoading(false);
        clearLoadingTimer();
      });
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="p-4 bg-gray-900 text-white">
        <h1 className="text-xl font-bold">HLS Video Player</h1>
        {videoSrc && (
          <p className="text-sm text-gray-400 mt-1 truncate">
            Source: {videoSrc}
          </p>
        )}
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white">Loading video...</p>
            <button
              onClick={() => {
                clearLoadingTimer();
                setIsLoading(false);
                setError("Loading cancelled. Try the direct MP4 option below.");
              }}
              className="mt-6 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Cancel Loading
            </button>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 text-red-200 p-6 rounded-lg max-w-lg">
            <h3 className="font-bold text-xl mb-2">Error</h3>
            <p>{error}</p>
            
            <div className="mt-6 pt-4 border-t border-red-800">
              <h4 className="font-medium mb-2">Troubleshooting:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Use a modern browser like Chrome, Firefox, or Safari</li>
                <li>Make sure FFmpeg converted the video properly</li>
                <li>Try a different video file if this issue persists</li>
                <li>Check that the video URL path is correct</li>
              </ul>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button 
                  onClick={tryDirectMp4}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Try Direct MP4
                </button>
                
                <Link 
                  href="/"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-center"
                >
                  Convert a New Video
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl shadow-2xl bg-black">
            <video 
              ref={videoRef}
              className="w-full h-auto rounded-lg"
              controls
              playsInline
              autoPlay
              poster="/thumbnail-placeholder.jpg"
              preload="auto"
              onError={(e) => {
                console.error("Video error event:", e);
                setError("Video playback error. The file may be corrupted or in an unsupported format.");
              }}
            />
          </div>
        )}
      </div>
      
      <div className="p-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-medium mb-2">How to use</h2>
          <p className="text-sm text-gray-300 mb-3">
            You can specify any HLS video URL by adding a query parameter: <code className="bg-gray-800 px-2 py-1 rounded">?url=your-m3u8-url</code>
          </p>
          <div className="bg-gray-800 p-3 rounded text-sm mb-3">
            <p>Example:</p>
            <code className="block mt-1 text-blue-400 break-all">
              /player?url=/hls/1744624790762-ec30f78n/playlist.m3u8
            </code>
          </div>
          <p className="text-sm text-gray-300">
            For direct MP4 playback (faster loading), add <code className="bg-gray-800 px-2 py-1 rounded">direct=true</code> parameter
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap the component with Suspense
export default function Player() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-white">Loading player...</p>
        </div>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
} 