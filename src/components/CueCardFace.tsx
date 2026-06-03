import { formatTime } from '../lib/time'
import type { HotCue } from '../types'
import { X, Pencil, Play } from 'lucide-react'

interface Props {
  cue: HotCue
  onEdit: () => void
  onDelete: () => void
  onSetIdle?: () => void
  isIdle?: boolean
}

// Matches the field captions in CueCardEdit.
const captionCls = 'text-[9px] uppercase tracking-wide text-[#777] leading-none'

// The inner content of a cue card — key, start offset, label, plus edit/delete
// buttons. Shared by the list view and the graph nodes; the outer container
// (sizing, highlight, click-to-play) lives in each view. Buttons carry `nodrag`
// so clicking them never starts a React Flow node drag.
export default function CueCardFace({ cue, onEdit, onDelete, onSetIdle, isIdle }: Props) {
  return (
    <>
      {onSetIdle && (
        <button
          className={`nodrag absolute top-1 right-20 bg-transparent border-none cursor-pointer leading-none rounded-[3px] ${isIdle ? 'text-[#4a8] hover:text-[#6cf]' : 'text-[#444] hover:text-[#888]'}`}
          title="Set as idle (loops when no video selected)"
          onClick={(e) => {
            e.stopPropagation()
            onSetIdle()
          }}
        >
          <Play size={12} />
        </button>
      )}
      <button
        className="nodrag absolute top-1 right-5 bg-transparent border-none text-[#444] cursor-pointer leading-none rounded-[3px] hover:text-white"
        title="Edit key, start, label"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
      >
        <Pencil size={12} />
      </button>
      <button
        className="nodrag absolute top-1 right-1 bg-transparent border-none text-[#444] cursor-pointer text-[10px] leading-none rounded-[3px] hover:text-[#c44]"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <X size={12} />
      </button>
      <div className="flex items-baseline gap-2 pr-10">
        <span className="text-base font-bold font-mono text-white leading-none">
          {cue.key ? cue.key.toUpperCase() : '—'}
        </span>
        <span className="text-[11px] text-[#666] font-mono leading-none">{formatTime(cue.startTime)}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={captionCls}>Title</span>
        <span className="text-[12px] font-semibold text-white leading-tight line-clamp-1">
          {cue.title || '—'}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={captionCls}>Label</span>
        <span className="text-[11px] text-[#bbb] leading-snug line-clamp-3">{cue.label || '—'}</span>
      </div>
    </>
  )
}
