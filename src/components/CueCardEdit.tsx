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

  return (
    <div
      className="relative flex flex-col items-start gap-1 p-1.5 bg-[#1c1c1c] border border-[#555] rounded cursor-default w-20 h-20 flex-shrink-0 overflow-hidden"
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
      <input
        className={`${inputCls} w-1/2 font-mono font-bold text-base${keyInvalid ? ' border-[#c44]' : ''}`}
        maxLength={1}
        value={keyVal}
        title="Trigger key (single character)"
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
        placeholder='A'
      />
      <input
        className={`${inputCls} w-full font-mono${timeInvalid ? ' border-[#c44]' : ''}`}
        value={timeVal}
        title="Start time (m:ss or seconds)"
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
      <input
        className={`${inputCls} w-full`}
        value={cue.label}
        placeholder="Label"
        autoFocus
        onChange={(e) => onUpdate({ label: e.target.value })}
      />
    </div>
  )
}
