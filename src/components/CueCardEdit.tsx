import { useState } from 'react'
import { formatTime, parseTime } from '../lib/time'
import type { HotCue } from '../types'
import { X } from 'lucide-react'

const inputCls =
  'bg-[#111] border border-[#444] rounded-[3px] text-[#eee] text-[11px] ' +
  'px-1 py-px h-5 outline-none focus:border-[#666]'

interface Props {
  cue: HotCue
  index: number
  cues: HotCue[]
  onUpdate: (patch: Partial<HotCue>) => void
  onDelete: () => void
  onClose: () => void
}

export default function CueCardEdit({ cue, index, cues, onUpdate, onDelete, onClose }: Props) {
  const [keyVal, setKeyVal] = useState(cue.key)
  const [timeVal, setTimeVal] = useState(formatTime(cue.startTime))
  const [keyInvalid, setKeyInvalid] = useState(false)
  const [timeInvalid, setTimeInvalid] = useState(false)

  const labelCls = 'text-[9px] uppercase tracking-wide text-[#777] leading-none'

  return (
    <div
      className="relative flex flex-col items-stretch gap-1.5 p-2 pt-2.5 bg-[#1c1c1c] border border-[#555] rounded cursor-default w-52 flex-shrink-0"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="absolute top-1 right-1 bg-transparent border-none text-[#444] cursor-pointer text-[10px] leading-none rounded-[3px] hover:text-[#c44]"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <X size={12} />
      </button>

      <p className="text-[10px] text-[#999] w-full overflow-hidden text-ellipsis whitespace-nowrap" title={cue.fileName}>
        {cue.fileName}
      </p>

      <label className="flex flex-col gap-0.5">
        <span className={labelCls}>Trigger key</span>
        <input
          className={`${inputCls} w-10 font-mono font-bold text-base${keyInvalid ? ' border-[#c44]' : ''}`}
          maxLength={1}
          value={keyVal}
          title="Single keyboard key, unique across cues"
          onChange={(e) => {
            const val = e.target.value.slice(-1).toLowerCase()
            setKeyVal(val)
            const dup = cues.some((c, i) => i !== index && c.key === val)
            if (val.length === 1 && !dup) {
              setKeyInvalid(false)
              onUpdate({ key: val })
            } else {
              setKeyInvalid(true)
            }
          }}
          placeholder="A"
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className={labelCls}>Start offset (m:ss)</span>
        <input
          className={`${inputCls} w-full font-mono${timeInvalid ? ' border-[#c44]' : ''}`}
          value={timeVal}
          title="Where in the clip to start — m:ss or seconds"
          onChange={(e) => setTimeVal(e.target.value)}
          onBlur={(e) => {
            const t = parseTime(e.target.value)
            if (t !== null) {
              setTimeInvalid(false)
              setTimeVal(formatTime(t))
              onUpdate({ startTime: t })
            } else {
              setTimeInvalid(true)
            }
          }}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className={labelCls}>Title</span>
        <input
          className={`${inputCls} w-full`}
          value={cue.title}
          placeholder="e.g. Introduction"
          autoFocus
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className={labelCls}>Label (spoken text)</span>
        <textarea
          className="bg-[#111] border border-[#444] rounded-[3px] text-[#eee] text-[11px] px-1 py-1 w-full h-12 resize-none leading-snug outline-none focus:border-[#666]"
          value={cue.label}
          placeholder="e.g. Hi, I'm Daan. How is your day going?"
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </label>
    </div>
  )
}
