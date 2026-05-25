import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import CueCardEdit from '../components/CueCardEdit'
import { formatTime } from '../lib/time'
import type { Segment } from '../types'

const btnCls =
  'px-3.5 border border-[#3a3a3a] bg-[#242424] text-[#ddd] rounded cursor-pointer ' +
  'text-[13px] whitespace-nowrap inline-flex items-center gap-1.5 leading-none h-8 ' +
  'hover:bg-[#2e2e2e] hover:border-[#555] hover:text-white'

export default function HotCuePlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Refs so the stable keydown effect always reads latest state
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments
  const editingIndexRef = useRef(editingIndex)
  editingIndexRef.current = editingIndex

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('segments') ?? '[]')
      if (Array.isArray(saved)) setSegments(saved)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('segments', JSON.stringify(segments))
  }, [segments])

  // Keyboard triggers + Escape — registered once, reads via refs
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        const idx = editingIndexRef.current
        if (idx === null) return
        setSegments((segs) => {
          if (!segs[idx]?.key) {
            const next = [...segs]
            next.splice(idx, 1)
            return next
          }
          return segs
        })
        setEditingIndex(null)
        return
      }

      const idx = segmentsRef.current.findIndex((s) => s.key === e.key.toLowerCase())
      if (idx === -1) return
      const seg = segmentsRef.current[idx]
      const vid = videoRef.current
      if (!vid) return

      vid.currentTime = seg.startTime
      void vid.play()
      setActiveIndex(idx)
      setTimeout(() => setActiveIndex(null), 300)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  function loadVideo(file: File) {
    if (!file.type.startsWith('video/')) return
    const url = URL.createObjectURL(file)
    setVideoSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  function closeEdit() {
    const idx = editingIndexRef.current
    if (idx === null) return
    if (!segmentsRef.current[idx]?.key) {
      setSegments((segs) => {
        const next = [...segs]
        next.splice(idx, 1)
        return next
      })
    }
    setEditingIndex(null)
  }

  function updateSegment(index: number, patch: Partial<Segment>) {
    setSegments((segs) => {
      const next = [...segs]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function addCue() {
    const idx = editingIndexRef.current
    const segs = segmentsRef.current
    const base = idx !== null && !segs[idx]?.key ? segs.filter((_, i) => i !== idx) : [...segs]
    const newSegs = [...base, { key: '', startTime: 0, label: '' }]
    setSegments(newSegs)
    setEditingIndex(newSegs.length - 1)
  }

  return (
    <>
      <Head>
        <title>Hot Cue Player</title>
      </Head>
      <div
        className="h-screen flex flex-col bg-[#111] text-[#eee] overflow-hidden font-sans"
        onClick={closeEdit}
      >
        {/* Player */}
        <div className="flex-1 relative bg-black overflow-hidden min-h-0">
          {!videoSrc && (
            <div
              className={`absolute inset-0 flex items-center justify-center border-2 border-dashed cursor-pointer transition-colors ${
                isDragOver ? 'border-[#aaa] bg-white/[0.03]' : 'border-[#333]'
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

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border-t border-[#2a2a2a] min-h-14 flex-shrink-0">
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
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {segments.map((seg, i) =>
              editingIndex === i ? (
                <CueCardEdit
                  key={i}
                  seg={seg}
                  index={i}
                  segments={segments}
                  onUpdate={(patch) => updateSegment(i, patch)}
                  onDelete={() => {
                    setSegments((segs) => segs.filter((_, idx) => idx !== i))
                    setEditingIndex(null)
                  }}
                  onClose={closeEdit}
                />
              ) : (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2 py-1 border rounded flex-shrink-0 h-9 whitespace-nowrap cursor-pointer ${
                    activeIndex === i
                      ? 'bg-[#383838] border-white transition-none'
                      : 'bg-[#242424] border-[#3a3a3a] hover:border-[#555] hover:bg-[#2a2a2a] transition-colors'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeEdit()
                    setEditingIndex(i)
                  }}
                >
                  <span className="bg-[#333] border border-[#555] rounded-[3px] px-[5px] py-px text-[11px] font-bold font-mono min-w-5 text-center text-white">
                    {seg.key.toUpperCase()}
                  </span>
                  <span className="text-xs text-[#777] font-mono">{formatTime(seg.startTime)}</span>
                  <span className="text-[13px] text-[#ccc] max-w-[140px] overflow-hidden text-ellipsis">
                    {seg.label || '—'}
                  </span>
                </div>
              ),
            )}
            <button
              className="w-8 h-8 bg-transparent border border-dashed border-[#3a3a3a] rounded text-[#555] cursor-pointer text-xl leading-none flex items-center justify-center flex-shrink-0 hover:border-[#666] hover:text-[#aaa]"
              title="Add segment"
              onClick={(e) => {
                e.stopPropagation()
                addCue()
              }}
            >
              +
            </button>
          </div>
        </div>

      </div>
    </>
  )
}
