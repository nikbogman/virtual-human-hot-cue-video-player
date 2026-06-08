import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { getVideo } from "../lib/videoDB";
import InteractiveOverlay from "../components/poking_yoda/poked_game";

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
  const pokedUrlRef = useRef<string | null>(null);
  const touchedScreenUrlRef = useRef<string | null>(null);
  const currentVideoTypeRef = useRef<"idle" | "poked" | "touched_screen">(
    "idle",
  );
  const stateBeforeOverlayRef = useRef<{
    videoId: string | null;
    currentTime: number;
    play: boolean;
  } | null>(null);

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

  const handlePokeClick = () => {
    const vid = videoRef.current;
    if (!vid || !pokedUrlRef.current) return;
    stateBeforeOverlayRef.current = {
      videoId: loadedIdRef.current,
      currentTime: vid.currentTime,
      play: !vid.paused,
    };
    currentVideoTypeRef.current = "poked";
    setVideoSrc(pokedUrlRef.current);
    void vid.play();
    setTimeout(() => {
      const state = stateBeforeOverlayRef.current;
      if (state) {
        currentVideoTypeRef.current = "idle";
        setVideoSrc(state.videoId ? urlCacheRef.current[state.videoId] : null);
        vid.currentTime = state.currentTime;
        if (state.play) void vid.play();
        else vid.pause();
      }
    }, 3000);
  };

  const handleBackgroundClick = () => {
    const vid = videoRef.current;
    if (!vid || !touchedScreenUrlRef.current) return;
    stateBeforeOverlayRef.current = {
      videoId: loadedIdRef.current,
      currentTime: vid.currentTime,
      play: !vid.paused,
    };
    currentVideoTypeRef.current = "touched_screen";
    setVideoSrc(touchedScreenUrlRef.current);
    void vid.play();
    setTimeout(() => {
      const state = stateBeforeOverlayRef.current;
      if (state) {
        currentVideoTypeRef.current = "idle";
        setVideoSrc(state.videoId ? urlCacheRef.current[state.videoId] : null);
        vid.currentTime = state.currentTime;
        if (state.play) void vid.play();
        else vid.pause();
      }
    }, 3000);
  };

  // Load poked and touched_screen videos
  useEffect(() => {
    let cancelled = false;
    const loadVideos = async () => {
      // Load /poked.mp4
      try {
        const pokedFile = new File(
          [await fetch("/poked.mp4").then((r) => r.blob())],
          "poked.mp4",
          { type: "video/mp4" },
        );
        const pokedUrl = URL.createObjectURL(pokedFile);
        if (!cancelled) pokedUrlRef.current = pokedUrl;
      } catch (e) {
        console.log("Failed to load poked video");
      }

      // Load /touched_screen.mp4
      try {
        const touchedFile = new File(
          [await fetch("/touched_screen.mp4").then((r) => r.blob())],
          "touched_screen.mp4",
          { type: "video/mp4" },
        );
        const touchedUrl = URL.createObjectURL(touchedFile);
        if (!cancelled) touchedScreenUrlRef.current = touchedUrl;
      } catch (e) {
        console.log("Failed to load touched_screen video");
      }
    };
    void loadVideos();
    return () => {
      cancelled = true;
    };
  }, []);

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
