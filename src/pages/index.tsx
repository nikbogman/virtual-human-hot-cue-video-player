import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'
import CueCardEdit from '../components/CueCardEdit'
import { useHotCues } from '../hooks/useHotCues'
import { useSyncBroadcast } from '../hooks/useSyncBroadcast'
import { formatTime } from '../lib/time'
import { storeVideo, getStoredVideo, clearStoredVideo } from '../lib/videoDB'
import type { HotCue } from '../types'
import { X, Trash2, Monitor, Upload, Download, Plus, Home } from 'lucide-react'

const btnCls =
  'px-3.5 border border-[#3a3a3a] bg-[#242424] text-[#ddd] rounded cursor-pointer ' +
  'text-[13px] whitespace-nowrap inline-flex items-center gap-1.5 leading-none h-8 ' +
  'hover:bg-[#2e2e2e] hover:border-[#555] hover:text-white'

function startsTicTacToe(cue: HotCue) {
  return /tic[-\s]?tac[-\s]?toe/i.test(cue.label)
}

function returnsToWelcome(cue: HotCue) {
  return /\b(welcome|start|home|reset)\b/i.test(cue.label)
}

export default function HotCuePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const { openMonitor, showTicTacToe, showWelcome, setTicTacToeBackground } = useSyncBroadcast(videoRef)

  function handleCuePress(cue: HotCue) {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = cue.startTime
    void vid.play()
    if (startsTicTacToe(cue)) showTicTacToe(cue.startTime)
    else if (returnsToWelcome(cue)) showWelcome(cue.startTime)
    else setTicTacToeBackground(cue.startTime)
  }

  const { cues, editingIndex, setEditingIndex, activeIndex, closeEdit, updateCue, addCue, deleteCue, clearCues, exportCues, importCues } =
    useHotCues(handleCuePress)

  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getStoredVideo().then((file) => {
      if (!file) return
      setVideoSrc(URL.createObjectURL(file))
    })
  }, [])

  function loadVideo(file: File) {
    if (!file.type.startsWith('video/')) return
    void storeVideo(file)
    const url = URL.createObjectURL(file)
    setVideoSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  function removeVideo() {
    setVideoSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    void clearStoredVideo()
  }

  return (
    <>
      <Head>
        <title>Hot Cue Player</title>
      </Head>
      <div
        className="h-screen flex flex-col bg-[#111] text-[#eee] overflow-hidden font-sans pt-20 px-10"
        onClick={closeEdit}
      >
        {/* Player */}
        <div className="relative bg-black overflow-hidden w-1/2 h-1/2 mx-auto">
          {!videoSrc && (
            <div
              className={`absolute inset-0 flex items-center justify-center border-2 border-dashed cursor-pointer transition-colors ${isDragOver ? 'border-[#aaa] bg-white/[0.03]' : 'border-[#333]'
                }`}
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) loadVideo(file)
              }}
            >
              <div className="flex flex-col items-center gap-3 text-[#666] text-sm pointer-events-none">
                <p>Drop a video file here</p>
                <span>or</span>
                <label
                  className={`${btnCls} pointer-events-auto`}
                  htmlFor="file-input"
                  onClick={(e) => e.stopPropagation()}
                >
                  Browse file
                </label>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${videoSrc ? 'block' : 'hidden'}`}
            controls
            src={videoSrc ?? undefined}
          />
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between gap-3 mt-6 mb-3 px-3 py-2 bg-[#1a1a1a] rounded min-h-10 flex-shrink-0">
          <button
            className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
            disabled={!videoSrc}
            onClick={(e) => { e.stopPropagation(); removeVideo() }}
          >
            <Trash2 size={14} />
            Remove video
          </button>
          <div className="flex items-center gap-2">
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              disabled={!videoSrc}
              onClick={(e) => { e.stopPropagation(); showWelcome(0) }}
            >
              <Home size={14} />
              Welcome
            </button>
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              disabled={!videoSrc}
              onClick={(e) => { e.stopPropagation(); openMonitor() }}
            >
              <Monitor size={14} />
              Open monitor
            </button>
          </div>
        </div>

        {/* Cue bar */}
        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
          <input
            id="file-input"
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) loadVideo(file)
              e.target.value = ''
            }}
          />
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importCues(file)
              e.target.value = ''
            }}
          />
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {cues.map((cue, i) =>
              editingIndex === i ? (
                <CueCardEdit
                  key={i}
                  cue={cue}
                  index={i}
                  cues={cues}
                  onUpdate={(patch) => updateCue(i, patch)}
                  onDelete={() => deleteCue(i)}
                  onClose={closeEdit}
                />
              ) : (
                <div
                  key={i}
                  className={`relative flex flex-col items-start gap-1 p-2 border rounded flex-shrink-0 w-20 h-20 cursor-pointer ${activeIndex === i
                    ? 'bg-[#383838] border-white transition-none'
                    : 'bg-[#242424] border-[#3a3a3a] hover:border-[#555] hover:bg-[#2a2a2a] transition-colors'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCuePress(cue)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    closeEdit()
                    setEditingIndex(i)
                  }}
                >
                  <button
                    className="absolute top-1 right-1 bg-transparent border-none text-[#444] cursor-pointer text-[10px] leading-none rounded-[3px] hover:text-[#c44]"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCue(i)
                    }}
                  >
                    <X size={12} />
                  </button>
                  <span className="text-base font-bold font-mono text-white leading-none">
                    {cue.key.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#666] font-mono leading-none">
                    {formatTime(cue.startTime)}
                  </span>
                  <span className="text-[11px] text-[#aaa] w-full overflow-hidden text-ellipsis whitespace-nowrap leading-none">
                    {cue.label || '—'}
                  </span>
                </div>
              ),
            )}
            <button
              className="w-20 h-20 bg-transparent border border-dashed border-[#3a3a3a] rounded text-[#555] cursor-pointer text-xl leading-none flex items-center justify-center flex-shrink-0 hover:border-[#666] hover:text-[#aaa]"
              title="Add hot cue"
              onClick={(e) => {
                e.stopPropagation()
                addCue()
              }}
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              className={btnCls}
              onClick={(e) => { e.stopPropagation(); importInputRef.current?.click() }}
            >
              <Upload size={14} />
              Import
            </button>
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              disabled={cues.length === 0}
              onClick={(e) => { e.stopPropagation(); exportCues() }}
            >
              <Download size={14} />
              Export
            </button>
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c44] hover:text-[#c44]`}
              disabled={cues.length === 0}
              onClick={(e) => { e.stopPropagation(); clearCues() }}
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
