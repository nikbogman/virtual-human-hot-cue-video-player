import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { getVideo } from "../lib/videoDB";
import InteractiveOverlay from "../components/PokingYoda/PokedGame";

export default function Monitor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [isIdleVideoActive, setIsIdleVideoActive] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const syncedRef = useRef(false);
  const pendingRef = useRef<{ currentTime: number; play: boolean } | null>(
    null,
  );

  // Which clip is currently loaded, and a cache of blob URLs by clip id.
  const loadedIdRef = useRef<string | null>(null);
  const urlCacheRef = useRef<Record<string, string>>({});

  // OPTIMIZATION: Assign the string paths directly instead of fetching/creating Blobs
  const pokedUrlRef = useRef<string | null>("/poked.mp4");
  const touchedScreenUrlRef = useRef<string | null>("/touched_screen.mp4");

  const currentVideoTypeRef = useRef<"idle" | "poked" | "touched_screen">(
    "idle",
  );
  const stateBeforeOverlayRef = useRef<{
    videoId: string | null;
    currentTime: number;
    play: boolean;
  } | null>(null);

  const playVideoWhenReady = (video: HTMLVideoElement) => {
    const playHandler = () => {
      video.removeEventListener("canplay", playHandler);
      video.play().catch((err) => console.error("Play error:", err));
    };
    video.addEventListener("canplay", playHandler);
  };

  const triggerOverlayVideo = (targetUrl: string | null) => {
    const vid = videoRef.current;
    if (!vid || !targetUrl) return;

    // Save state before changing video source
    stateBeforeOverlayRef.current = {
      videoId: loadedIdRef.current,
      currentTime: vid.currentTime,
      play: !vid.paused,
    };

    vid.pause();
    vid.src = targetUrl;
    vid.currentTime = 0;
    vid.load();
    playVideoWhenReady(vid);

    // Revert back to base video after 3 seconds
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

  const handlePokeClick = () => {
    currentVideoTypeRef.current = "poked";
    triggerOverlayVideo(pokedUrlRef.current);
  };

  const handleBackgroundClick = () => {
    currentVideoTypeRef.current = "touched_screen";
    triggerOverlayVideo(touchedScreenUrlRef.current);
  };
  // -----------------------------------------------

  useEffect(() => {
    const channel = new BroadcastChannel("video_sync");
    channelRef.current = channel;
    const urlCache = urlCacheRef.current;

    // Load the requested clip into the player (no-op if already loaded).
    async function ensureClip(id: string | null) {
      if (!id || loadedIdRef.current === id) return;
      let url = urlCache[id];
      if (!url) {
        const file = await getVideo(id);
        if (!file) return;
        url = URL.createObjectURL(file);
        urlCache[id] = url;
      }
      loadedIdRef.current = id;
      setVideoSrc(url);
    }

    channel.addEventListener("message", ({ data }) => {
      const vid = videoRef.current;
      if (!vid) return;

      let play: boolean;
      if (data.type === "send_initial_state") {
        if (!syncedRef.current) return;
        play = data.isPlaying;
      } else if (data.type === "play") {
        play = true;
      } else if (data.type === "pause") {
        play = false;
      } else if (data.type === "seek") {
        play = !vid.paused; // a seek alone shouldn't change play/pause state
      } else {
        return;
      }

      setIsIdleVideoActive(data.isIdle === true);
      pendingRef.current = { currentTime: data.currentTime, play };
      const wasLoaded = loadedIdRef.current === data.videoId;
      void ensureClip(data.videoId).then(() => {
        const v = videoRef.current;
        // If the clip was already loaded, apply now; otherwise onLoadedMetadata will.
        if (v && wasLoaded && v.readyState >= 1) applyPending(v);
      });
    });

    return () => {
      Object.values(urlCache).forEach((u) => URL.revokeObjectURL(u));
      channel.close();
    };
  }, []);

  function applyPending(vid: HTMLVideoElement) {
    const p = pendingRef.current;
    if (!p) return;
    vid.currentTime = p.currentTime;
    if (p.play) void vid.play();
    else vid.pause();
    pendingRef.current = null;
  }

  function handleSync() {
    syncedRef.current = true;
    setSynced(true);
    channelRef.current?.postMessage({ type: "request_initial_state" });
  }

  // Load idle video when it becomes active
  useEffect(() => {
    if (!isIdleVideoActive) return;
  }, [isIdleVideoActive]);

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>
      <div className="h-screen bg-black relative overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc ?? undefined}
          className="w-full h-full object-contain"
          onLoadedMetadata={() => applyPending(videoRef.current!)}
        />
        {!synced && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer"
            onClick={handleSync}
          >
            <span className="text-[#666] text-sm">Click to sync</span>
          </div>
        )}
        {isIdleVideoActive && (
          <InteractiveOverlay
            onPokeClick={handlePokeClick}
            onBackgroundClick={handleBackgroundClick}
          />
        )}
      </div>
    </>
  );
}
