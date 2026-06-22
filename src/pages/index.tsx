import { useState, useRef, useMemo, useEffect } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import CueCardEdit from "../components/CueCardEdit";
import CueCardFace from "../components/CueCardFace";
import { useHotCues } from "../hooks/useHotCues";
import { useCueGraph } from "../hooks/useCueGraph";
import { useChildPageController } from "../hooks/controller/useChildPageController";
import { useInterval } from "../hooks/useInterval";
import type { MonitorMode } from "../hooks/controller/types";
import { useCueBlobUrls } from "../hooks/useCueBlobUrls";
import { storeVideo, deleteVideo, clearAllVideos } from "../lib/videoDB";
import { cueCardBase, cueHighlightClass } from "../lib/cueStyle";
import { SLOT_GROUPS, type GameSlot, type HotCue } from "../types";
import {
  Monitor,
  Upload,
  Download,
  Plus,
  Trash2,
  List,
  Network,
} from "lucide-react";

const CueGraph = dynamic(() => import("../components/CueGraph"), {
  ssr: false,
});

const btnCls =
  "px-3.5 border border-[#3a3a3a] bg-[#242424] text-[#ddd] rounded cursor-pointer " +
  "text-[13px] whitespace-nowrap inline-flex items-center gap-1.5 leading-none h-8 " +
  "hover:bg-[#2e2e2e] hover:border-[#555] hover:text-white";

function SlotDisplay({
  slot,
  cue,
}: {
  slot: GameSlot;
  cue: HotCue | undefined;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[#888]">{slot.label}</span>
      {cue ? (
        <>
          <span className="text-[#ddd]">{cue.title || cue.fileName}</span>
          {cue.key && (
            <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded border border-[#3a3a3a] bg-[#2a2a2a] text-[#ccc] font-mono text-[11px] leading-none">
              {cue.key.toUpperCase()}
            </kbd>
          )}
        </>
      ) : (
        <span className="text-[#555]">— none —</span>
      )}
    </span>
  );
}

function nameWithoutExt(name: string) {
  return name.replace(/\.[^./\\]+$/, "");
}

function getModeFromTitle(title: string): MonitorMode {
  if (title === "idle" || title.startsWith("poke")) return "idle";
  if (title.startsWith("tictactoe")) return "tic-tac-toe";
  if (title.startsWith("rps")) return "rock-paper-scissors";
  return "video";
}

export default function HotCuePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"list" | "graph">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    cues,
    editingIndex,
    setEditingIndex,
    closeEdit,
    updateCue,
    addCues,
    deleteCue,
    clearCues,
    exportCues,
    importCues,
  } = useHotCues(handleCuePress);

  const graph = useCueGraph();

  const urls = useCueBlobUrls(cues);
  const playing = useMemo(() => {
    const cue = cues.find((c) => c.id === selectedId) ?? cues[0];
    const id = cue?.id ?? null;
    return { id, src: id ? urls[id] : undefined };
  }, [selectedId, cues, urls]);

  const cueByTitle = useMemo(
    () => new Map(cues.map((c) => [c.title, c])),
    [cues],
  );

  const videoIdRef = useRef(playing.id);
  const modeRef = useRef<MonitorMode>("video");
  videoIdRef.current = playing.id;

  const activeCue = cues.find((c) => c.id === playing.id);
  modeRef.current = activeCue ? getModeFromTitle(activeCue.title) : "video";

  const { openChildPage, sendCommandToChild, onConnected, onMessage } =
    useChildPageController();

  const syncReactionCue = (title: string) => {
    const cue = cues.find((c) => c.title === title);
    if (!cue) return;
    const vid = videoRef.current;
    setSelectedId(cue.id);
    if (vid) {
      vid.currentTime = cue.startTime;
      void vid.play();
    }

    sendCommandToChild({ type: "CHANGE_MODE", mode: "idle" });
    sendCommandToChild({
      type: "SYNC_VIDEO",
      event: "play",
      mode: "idle",
      payload: { id: cue.id, currentTime: cue.startTime, sentAt: Date.now() },
    });
  };

  onMessage("YODA_POKED", () => syncReactionCue("poke-yoda"));
  onMessage("BACKGROUND_POKED", () => syncReactionCue("poke-bg"));

  onConnected(() => {
    const vid = videoRef.current;
    if (!vid) return;
    sendCommandToChild({
      type: "SYNC_VIDEO",
      event: vid.paused ? "pause" : "play",
      mode: modeRef.current,
      payload: {
        id: videoIdRef.current ?? "",
        currentTime: vid.currentTime,
        sentAt: Date.now(),
      },
    });
  });

  useInterval(500, () => {
    const vid = videoRef.current;
    if (!vid) return;
    sendCommandToChild({
      type: "SYNC_VIDEO",
      event: vid.paused ? "pause" : "play",
      mode: modeRef.current,
      payload: {
        id: videoIdRef.current ?? "",
        currentTime: vid.currentTime,
        sentAt: Date.now(),
      },
    });
  });

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const postPlayback = (event: "play" | "pause" | "seek") =>
      sendCommandToChild({
        type: "SYNC_VIDEO",
        event,
        mode: modeRef.current,
        payload: {
          id: videoIdRef.current ?? "",
          currentTime: vid.currentTime,
          sentAt: Date.now(),
        },
      });

    const onPlay = () => postPlayback("play");
    const onPause = () => postPlayback("pause");
    const onSeeked = () => postPlayback("seek");

    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("seeked", onSeeked);

    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("seeked", onSeeked);
    };
  }, []);

  useEffect(() => {
    sendCommandToChild({ type: "CUES_UPDATE" });
  }, [cues]);

  function applyActiveCue() {
    const vid = videoRef.current;
    const cue = cues.find((c) => c.id === playing.id);
    if (!vid || !cue) return;
    vid.currentTime = cue.startTime;
    void vid.play();

    sendCommandToChild({
      type: "CHANGE_MODE",
      mode: getModeFromTitle(cue.title),
    });
  }

  function handleCuePress(cue: HotCue) {
    if (playing.id === cue.id) {
      applyActiveCue();
    } else {
      setSelectedId(cue.id);
    }
  }

  function handleDeleteCue(i: number) {
    const id = cues[i]?.id;
    if (id) void deleteVideo(id);
    deleteCue(i);
    if (id) graph.removeNode(id);
  }

  function handleClearCues() {
    void clearAllVideos();
    clearCues();
    graph.clear();
  }

  async function importClips(files: FileList | File[]) {
    const videos = Array.from(files).filter((f) => f.type.startsWith("video/"));
    if (videos.length === 0) return;
    const newCues = [];
    for (const file of videos) {
      const id = crypto.randomUUID();
      await storeVideo(id, file);
      newCues.push({
        id,
        key: "",
        startTime: 0,
        title: nameWithoutExt(file.name),
        label: "",
        fileName: file.name,
      });
    }
    addCues(newCues);
  }

  const nextIds = useMemo(
    () =>
      new Set(
        graph.links.filter((l) => l.source === selectedId).map((l) => l.target),
      ),
    [graph.links, selectedId],
  );

  const toggleBtn = (isActive: boolean) =>
    `px-3 h-8 text-[13px] inline-flex items-center gap-1.5 cursor-pointer leading-none ${
      isActive
        ? "bg-[#2e2e2e] text-white"
        : "bg-[#1a1a1a] text-[#888] hover:text-[#ccc]"
    }`;

  return (
    <>
      <Head>
        <title>Hot Cue Player</title>
      </Head>
      <div
        className="h-screen flex flex-col bg-[#111] text-[#eee] overflow-hidden font-sans pt-20 px-10"
        onClick={closeEdit}
      >
        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void importClips(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importCues(file);
            e.target.value = "";
          }}
        />

        <div className="relative bg-black overflow-hidden w-1/2 h-1/2 mx-auto flex-shrink-0">
          {cues.length === 0 && (
            <div
              className={`absolute inset-0 flex items-center justify-center border-2 border-dashed cursor-pointer transition-colors ${
                isDragOver ? "border-[#aaa] bg-white/[0.03]" : "border-[#333]"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files.length)
                  void importClips(e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col items-center gap-3 text-[#666] text-sm pointer-events-none">
                <p>Drop short video clips here</p>
                <span>or</span>
                <label
                  className={`${btnCls} pointer-events-auto`}
                  htmlFor="file-input"
                  onClick={(e) => e.stopPropagation()}
                >
                  Browse files
                </label>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${playing.src ? "block" : "hidden"}`}
            controls
            src={playing.src}
            onLoadedMetadata={applyActiveCue}
          />
        </div>

        <div className="flex items-center justify-between mt-6 mb-3 px-3 py-2 bg-[#1a1a1a] rounded min-h-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded border border-[#3a3a3a] overflow-hidden">
              <button
                className={toggleBtn(view === "list")}
                onClick={(e) => {
                  e.stopPropagation();
                  setView("list");
                }}
              >
                <List size={14} />
                List
              </button>
              <button
                className={toggleBtn(view === "graph")}
                onClick={(e) => {
                  e.stopPropagation();
                  setView("graph");
                }}
              >
                <Network size={14} />
                Graph
              </button>
            </div>
            <button
              className={btnCls}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Plus size={14} />
              Add clips
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              disabled={!playing.src}
              onClick={(e) => {
                e.stopPropagation();
                openChildPage();
              }}
            >
              <Monitor size={14} />
              Open monitor
            </button>
            <button
              className={btnCls}
              onClick={(e) => {
                e.stopPropagation();
                importInputRef.current?.click();
              }}
            >
              <Upload size={14} />
              Import
            </button>
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              disabled={cues.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                exportCues();
              }}
            >
              <Download size={14} />
              Export
            </button>
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c44] hover:text-[#c44]`}
              disabled={cues.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                handleClearCues();
              }}
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
        </div>

        {SLOT_GROUPS.map((group) => (
          <div
            key={group.label}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 px-3 py-2 bg-[#1a1a1a] rounded flex-shrink-0 text-[13px]"
          >
            <span className="text-[#888] font-medium">{group.label}</span>
            {group.slots.map((slot) => (
              <SlotDisplay
                key={slot.key}
                slot={slot}
                cue={cueByTitle.get(slot.key)}
              />
            ))}
          </div>
        ))}

        {view === "list" ? (
          <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0 overflow-x-auto">
            {cues.map((cue, i) =>
              editingIndex === i ? (
                <CueCardEdit
                  key={cue.id}
                  cue={cue}
                  index={i}
                  cues={cues}
                  onUpdate={(patch) => updateCue(i, patch)}
                  onDelete={() => handleDeleteCue(i)}
                  onClose={closeEdit}
                />
              ) : (
                <div
                  key={cue.id}
                  className={`${cueCardBase} flex-shrink-0 ${cueHighlightClass(selectedId === cue.id, nextIds.has(cue.id))}`}
                  title={cue.fileName}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCuePress(cue);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingIndex(i);
                  }}
                >
                  <CueCardFace
                    cue={cue}
                    onEdit={() => setEditingIndex(i)}
                    onDelete={() => handleDeleteCue(i)}
                  />
                </div>
              ),
            )}
            <button
              className="w-16 h-28 bg-transparent border border-dashed border-[#3a3a3a] rounded text-[#555] cursor-pointer text-xl leading-none flex items-center justify-center flex-shrink-0 hover:border-[#666] hover:text-[#aaa]"
              title="Upload clip(s)"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Plus size={20} />
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 mb-3 rounded overflow-hidden border border-[#222]">
            <CueGraph
              cues={cues}
              positions={graph.positions}
              links={graph.links}
              playingId={selectedId}
              nextIds={nextIds}
              editingIndex={editingIndex}
              onPlay={handleCuePress}
              onEdit={(i) => setEditingIndex(i)}
              onDelete={handleDeleteCue}
              onUpdate={updateCue}
              onClose={closeEdit}
              setPosition={graph.setPosition}
              addLink={graph.addLink}
              removeLink={graph.removeLink}
            />
          </div>
        )}
      </div>
    </>
  );
}
