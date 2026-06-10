import { useState, useRef, useEffect, useMemo } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import CueCardEdit from '../components/CueCardEdit'
import CueCardFace from '../components/CueCardFace'
import { useHotCues } from '../hooks/useHotCues'
import { useCueGraph } from '../hooks/useCueGraph'
import { useSyncBroadcast } from '../hooks/useSyncBroadcast'
import { getVideo } from '../lib/videoDB'
import { cueCardBase, cueHighlightClass } from '../lib/cueStyle'
import type { HotCue } from '../types'
import { Monitor, Upload, Download, Plus, Trash2, List, Network, Home, X} from 'lucide-react'

// React Flow measures the DOM, so the canvas is client-only (Pages Router).
const CueGraph = dynamic(() => import('../components/CueGraph'), { ssr: false })

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
  const importInputRef = useRef<HTMLInputElement>(null)

  const [view, setView] = useState<'list' | 'graph'>('list')

  // One blob URL per clip id, kept in sync with the cue list.
  const [urls, setUrls] = useState<Record<string, string>>({})
  const urlsRef = useRef(urls)
  useEffect(() => {
    urlsRef.current = urls
  })

  // The explicitly triggered clip; defaults to the first cue (see activeId below).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)

  // The cue that was last triggered — used to light up the playing card and to
  // surface its connected "next" cues. Stays set until another cue is pressed.
  const [playingId, setPlayingId] = useState<string | null>(null)

  const [isDragOver, setIsDragOver] = useState(false)

  const { openMonitor, showTicTacToe, showWelcome, setTicTacToeBackground } = useSyncBroadcast(videoRef)

  // Cue waiting to be seeked + played once its clip has loaded.
  const pendingCueRef = useRef<HotCue | null>(null)

  function applyPendingCue() {
    const vid = videoRef.current
    const cue = pendingCueRef.current
    if (!vid || !cue) return
    vid.currentTime = cue.startTime
    void vid.play()
    if (startsTicTacToe(cue)) showTicTacToe(cue.startTime)
    else if (returnsToWelcome(cue)) showWelcome(cue.startTime)
    else setTicTacToeBackground(cue.startTime)
    pendingCueRef.current = null
  }

  function handleCuePress(cue: HotCue) {
    setPlayingId(cue.id)
    pendingCueRef.current = cue
    if (activeIdRef.current === cue.id) {
      applyPendingCue() // clip already loaded — seek + play now
    } else {
      setSelectedId(cue.id) // switch clips; onLoadedMetadata will apply
    }
  }

  const { cues, editingIndex, setEditingIndex, closeEdit, updateCue, addClips, deleteCue, clearCues, exportCues, importCues } =
    useHotCues(handleCuePress)

  const graph = useCueGraph()

  // Delete / clear must also prune the graph layout (positions + links).
  function handleDeleteCue(i: number) {
    const id = cues[i]?.id
    deleteCue(i)
    if (id) graph.removeNode(id)
  }

  function handleClearCues() {
    clearCues()
    graph.clear()
  }

  // Targets of the playing cue's outgoing links — highlighted as "up next".
  const nextIds = useMemo(
    () => new Set(graph.links.filter((l) => l.source === playingId).map((l) => l.target)),
    [graph.links, playingId],
  )

  // Effective active clip: the explicitly selected one if it still exists, else
  // the first cue so the player shows a frame instead of black. Derived, not effect-synced.
  const activeId = selectedId && cues.some((c) => c.id === selectedId) ? selectedId : cues[0]?.id ?? null
  useEffect(() => {
    activeIdRef.current = activeId
  })

  const { openMonitor } = useSyncBroadcast(videoRef, () => activeIdRef.current)

  // Load a blob URL for every cue's clip; revoke URLs for removed cues.
  useEffect(() => {
    let cancelled = false
    const current = urlsRef.current
    const ids = new Set(cues.map((c) => c.id))
    const stale = Object.keys(current).filter((id) => !ids.has(id))
    stale.forEach((id) => URL.revokeObjectURL(current[id]))
    const missing = cues.filter((c) => !current[c.id])

    void Promise.all(
      missing.map(async (c) => {
        const file = await getVideo(c.id)
        return file ? ([c.id, URL.createObjectURL(file)] as const) : null
      }),
    ).then((entries) => {
      if (cancelled) return
      setUrls((prev) => {
        const next = { ...prev }
        stale.forEach((id) => delete next[id])
        for (const e of entries) if (e) next[e[0]] = e[1]
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [cues])

  // Revoke all blob URLs on unmount.
  useEffect(
    () => () => {
      Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  const activeSrc = activeId ? urls[activeId] : undefined

  const toggleBtn = (active: boolean) =>
    `px-3 h-8 text-[13px] inline-flex items-center gap-1.5 cursor-pointer leading-none ${active ? 'bg-[#2e2e2e] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-[#ccc]'
    }`

  return (
    <>
      <Head>
        <title>Hot Cue Player</title>
      </Head>
      <div
        className="h-screen flex flex-col bg-[#111] text-[#eee] overflow-hidden font-sans pt-20 px-10"
        onClick={closeEdit}
      >
        {/* Hidden inputs (available in both views) */}
        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addClips(e.target.files)
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

        {/* Player */}
        <div className="relative bg-black overflow-hidden w-1/2 h-1/2 mx-auto flex-shrink-0">
          {cues.length === 0 && (
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
                if (e.dataTransfer.files.length) void addClips(e.dataTransfer.files)
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
            className={`w-full h-full object-contain ${activeSrc ? 'block' : 'hidden'}`}
            controls
            src={activeSrc}
            onLoadedMetadata={applyPendingCue}
          />
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between mt-6 mb-3 px-3 py-2 bg-[#1a1a1a] rounded min-h-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded border border-[#3a3a3a] overflow-hidden">
              <button className={toggleBtn(view === 'list')} onClick={(e) => { e.stopPropagation(); setView('list') }}>
                <List size={14} />
                List
              </button>
              <button className={toggleBtn(view === 'graph')} onClick={(e) => { e.stopPropagation(); setView('graph') }}>
                <Network size={14} />
                Graph
              </button>
            </div>
            <button className={btnCls} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
              <Plus size={14} />
              Add clips
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`${btnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              disabled={!activeSrc}
              onClick={(e) => { e.stopPropagation(); openMonitor() }}
            >
              <Monitor size={14} />
              Open monitor
            </button>
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
              onClick={(e) => { e.stopPropagation(); handleClearCues() }}
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
        </div>

        {/* Body: list row or node graph */}
        {view === 'list' ? (
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
                  className={`${cueCardBase} flex-shrink-0 ${cueHighlightClass(playingId === cue.id, nextIds.has(cue.id))}`}
                  title={cue.fileName}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCuePress(cue)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setEditingIndex(i)
                  }}
                >
                  <CueCardFace cue={cue} onEdit={() => setEditingIndex(i)} onDelete={() => handleDeleteCue(i)} />
                </div>
              ),
            )}
            <button
              className="w-16 h-40 bg-transparent border border-dashed border-[#3a3a3a] rounded text-[#555] cursor-pointer text-xl leading-none flex items-center justify-center flex-shrink-0 hover:border-[#666] hover:text-[#aaa]"
              title="Upload clip(s)"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
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
              playingId={playingId}
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
  )
}
