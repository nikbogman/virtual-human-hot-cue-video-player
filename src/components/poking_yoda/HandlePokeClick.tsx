import React, { useRef } from "react";

// --- TYPES & INTERFACES ---
interface VideoState {
  videoId: string | null;
  currentTime: number;
  play: boolean;
}

// Dummy types for your existing refs context
// (Keep or merge these with your component's actual definitions)
interface VideoControllerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  loadedIdRef: React.RefObject<string | null>;
  pokedUrlRef: React.RefObject<string | null>;
  touchedScreenUrlRef: React.RefObject<string | null>;
  stateBeforeOverlayRef: React.RefObject<VideoState | null>;
  urlCacheRef: React.RefObject<Record<string, string>>;
}

// --- REFACTOR & CONVERSION ---
export const useOverlayHandlers = ({
  videoRef,
  loadedIdRef,
  pokedUrlRef,
  touchedScreenUrlRef,
  stateBeforeOverlayRef,
  urlCacheRef,
}: VideoControllerProps) => {

  // Reusable function to handle playing a video safely after metadata loads
  const playVideoWhenReady = (video: HTMLVideoElement) => {
    const playHandler = () => {
      video.removeEventListener("canplay", playHandler);
      video.play().catch((err) => console.error("Play error:", err));
    };
    video.addEventListener("canplay", playHandler);
  };

  // Shared logic for both clicking the hotspot and the background
  const triggerOverlayVideo = (targetUrl: string | null) => {
    const vid = videoRef.current;
    if (!vid || !targetUrl) return;

    // 1. Capture and save current state
    stateBeforeOverlayRef.current = {
      videoId: loadedIdRef.current,
      currentTime: vid.currentTime,
      play: !vid.paused,
    };

    // 2. Load and play the reaction overlay video
    vid.pause();
    vid.src = targetUrl;
    vid.currentTime = 0;
    vid.load();
    playVideoWhenReady(vid);

    // 3. Reset back to the original video state after 3 seconds
    setTimeout(() => {
      const state = stateBeforeOverlayRef.current;
      if (!state) return;

      const idleUrl = state.videoId ? urlCacheRef.current[state.videoId] : null;
      if (idleUrl) {
        vid.pause();
        vid.src = idleUrl;
        vid.currentTime = state.currentTime;
        vid.load();

        if (state.play) {
          playVideoWhenReady(vid);
        }
      }
    }, 3000);
  };

  // --- FINAL HANDLERS ---
  const handlePokeClick = () => {
    triggerOverlayVideo(pokedUrlRef.current);
  };

  const handleBackgroundClick = () => {
    triggerOverlayVideo(touchedScreenUrlRef.current);
  };

  return { handlePokeClick, handleBackgroundClick };
};