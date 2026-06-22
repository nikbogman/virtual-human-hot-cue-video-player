import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
// import TicTacToe from '../components/TicTacToe'
import InteractiveOverlay from "../components/PokingYoda/PokedGame";
// import RockPaperScissors from '../components/RockPaperScissors/RockPaperScissors'
import { useParentPageController } from "../hooks/controller/useParentPageController";
import { useMonitorVideos } from "../hooks/useMonitorVideos";
// import { ALL_BINDING_SLOTS, type GameClip, type GameClips, type RPSClips } from '../types'
import type { MonitorMode } from "../hooks/controller/types";

const safePlay = (vid: HTMLVideoElement) =>
  vid.play().catch((e: unknown) => {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    throw e;
  });

export default function Monitor() {
  const { clips, reload } = useMonitorVideos();
  const { onMessage, sendToParent } = useParentPageController();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<MonitorMode>("video");
  const [synced, setSynced] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  // const [gameSession, setGameSession] = useState(0)
  // const [rpsSession, setRpsSession] = useState(0)
  // const [gameClips, setGameClips] = useState<GameClips>({
  //   start: null, place: null, win: null, lose: null, draw: null, idle: null,
  // })
  // const [rpsClips, setRpsClips] = useState<RPSClips>({
  //   intro: null,
  //   rock_win: null, rock_lose: null, rock_draw: null,
  //   paper_win: null, paper_lose: null, paper_draw: null,
  //   scissors_win: null, scissors_lose: null, scissors_draw: null,
  // })

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const activeIdRef = useRef<string | null>(null);
  const modeRef = useRef<MonitorMode>("video");

  const lastSyncRef = useRef<{
    id: string;
    currentTime: number;
    event: "play" | "pause" | "seek";
    sentAt: number;
  } | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    console.log("[monitor] mode:", mode);
  }, [mode]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  onMessage("CUES_UPDATE", () => {
    void reload().then(() => {
      const cues: { id: string; title: string; startTime: number }[] =
        JSON.parse(localStorage.getItem("hotCues") ?? "[]");
      const byTitle = (title: string) =>
        cues.find((c) => c.title === title) ?? null;

      // const getClip = (title: string): GameClip => {
      //   const cue = byTitle(title)
      //   if (!cue) return null
      //   const src = videoRefs.current.get(cue.id)?.src ?? null
      //   return src ? { src, startTime: cue.startTime } : null
      // }
      // Promise.all(
      //   ALL_BINDING_SLOTS.map(async (s) => [s.key, getClip(s.key)] as const)
      // ).then((entries) => {
      //   const r = Object.fromEntries(entries) as Record<string, GameClip>
      //   setGameClips({ start: r.start, place: r.place, win: r.win, lose: r.lose, draw: r.draw, idle: r.idle })
      //   setRpsClips({
      //     intro: r.intro,
      //     rock_win: r.rock_win, rock_lose: r.rock_lose, rock_draw: r.rock_draw,
      //     paper_win: r.paper_win, paper_lose: r.paper_lose, paper_draw: r.paper_draw,
      //     scissors_win: r.scissors_win, scissors_lose: r.scissors_lose, scissors_draw: r.scissors_draw,
      //   })
      // }).catch(console.error)
    });
  });

  onMessage("CHANGE_MODE", ({ mode }) => {
    modeRef.current = mode;
    setMode(mode);
    setShowOverlay(mode === "idle");
    if (mode !== "video" && mode !== "idle") {
      videoRefs.current.get(activeIdRef.current ?? "")?.pause();
    }
  });

  onMessage("SYNC_VIDEO", ({ event, payload }) => {
    lastSyncRef.current = {
      id: payload.id,
      currentTime: payload.currentTime,
      event,
      sentAt: payload.sentAt,
    };
    if (activeIdRef.current !== payload.id) {
      videoRefs.current.get(activeIdRef.current ?? "")?.pause();
      setActiveId(payload.id);
      activeIdRef.current = payload.id;
    }
    const vid = videoRefs.current.get(payload.id);
    if (!vid) return;
    const lag = (Date.now() - payload.sentAt) / 1000;
    const expectedTime = payload.currentTime + (event === "play" ? lag : 0);
    const drift = Math.abs(vid.currentTime - expectedTime);
    if (drift > 0.3) vid.currentTime = expectedTime;
    if (event === "play" && vid.paused) void safePlay(vid);
    else if (event === "pause" && !vid.paused) vid.pause();
  });

  const applyLastSync = useCallback(() => {
    const s = lastSyncRef.current;
    if (!s) return;
    setActiveId(s.id);
    activeIdRef.current = s.id;
    const vid = videoRefs.current.get(s.id);
    if (!vid) return;
    const elapsed = (Date.now() - s.sentAt) / 1000;
    vid.currentTime = s.currentTime + (s.event === "play" ? elapsed : 0);
    if (s.event === "play") void safePlay(vid);
    else if (s.event === "pause") vid.pause();
  }, []);

  useEffect(() => {
    if (clips.length > 0) applyLastSync();
  }, [clips]);

  const handleSync = useCallback(() => {
    setSynced(true);
    applyLastSync();
    // const saved = localStorage.getItem('monitorMode')
    // if (saved === 'tic-tac-toe') {
    //   modeRef.current = 'tic-tac-toe'
    //   setMode('tic-tac-toe')
    //   setShowOverlay(false)
    //   setGameSession((p) => p + 1)
    // } else if (saved === 'rock-paper-scissors') {
    //   modeRef.current = 'rock-paper-scissors'
    //   setMode('rock-paper-scissors')
    //   setShowOverlay(false)
    //   setRpsSession((p) => p + 1)
    // }
  }, []);

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>

      <div className="monitor-font h-screen bg-black relative overflow-hidden">
        {clips.map(({ id, src }) => (
          <video
            key={id}
            src={src}
            ref={(el) => {
              if (el) videoRefs.current.set(id, el);
              else videoRefs.current.delete(id);
            }}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ display: id === activeId ? "block" : "none" }}
          />
        ))}

        {/* {mode === 'tic-tac-toe' && (
          <TicTacToe key={gameSession} clips={gameClips} />
        )} */}

        {/* {mode === 'rock-paper-scissors' && (
          <div className="absolute inset-0 z-50">
            <RockPaperScissors key={rpsSession} clips={rpsClips} />
          </div>
        )} */}

        {!synced && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer z-[60]"
            onClick={handleSync}
          >
            <span className="text-[#666] text-sm">Click to sync</span>
          </div>
        )}

        {mode === "idle" && showOverlay && (
          <InteractiveOverlay
            onPokeClick={() => sendToParent({ type: "YODA_POKED" })}
            onBackgroundClick={() => sendToParent({ type: "BACKGROUND_POKED" })}
          />
        )}
      </div>
    </>
  );
}
