import { useState } from 'react'
import { formatTime, parseTime } from '../lib/time'
import type { Segment } from '../types'

const inputCls =
  'bg-[#111] border border-[#444] rounded-[3px] text-[#eee] text-xs ' +
  'px-[5px] py-[2px] h-6 outline-none focus:border-[#666]'

interface Props {
  seg: Segment
  index: number
  segments: Segment[]
  onUpdate: (patch: Partial<Segment>) => void
  onDelete: () => void
  onClose: () => void
}

export default function CueCardEdit({ seg, index, segments, onUpdate, onDelete, onClose }: Props) {
  const [keyVal, setKeyVal] = useState(seg.key)
  const [timeVal, setTimeVal] = useState(formatTime(seg.startTime))
  const [keyInvalid, setKeyInvalid] = useState(false)
  const [timeInvalid, setTimeInvalid] = useState(false)

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 bg-[#1c1c1c] border border-[#555] rounded cursor-default h-9 whitespace-nowrap flex-shrink-0"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        className={`${inputCls} w-[30px] text-center font-mono font-bold text-[13px]${keyInvalid ? ' border-[#c44]' : ''}`}
        maxLength={1}
        value={keyVal}
        title="Trigger key (single character)"
        onChange={(e) => {
          const val = e.target.value.slice(-1).toLowerCase()
          setKeyVal(val)
          const dup = segments.some((s, i) => i !== index && s.key === val)
          if (val.length === 1 && !dup) {
            setKeyInvalid(false)
            onUpdate({ key: val })
          } else {
            setKeyInvalid(true)
          }
        }}
      />
      <input
        className={`${inputCls} w-[54px] font-mono text-center${timeInvalid ? ' border-[#c44]' : ''}`}
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
        className={`${inputCls} w-[120px]`}
        value={seg.label}
        placeholder="Label"
        autoFocus
        onChange={(e) => onUpdate({ label: e.target.value })}
      />
      <button
        className="bg-transparent border-none text-[#555] cursor-pointer text-[11px] px-[4px] py-[2px] leading-none rounded-[3px] hover:text-[#c44] hover:bg-red-500/10"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        ✕
      </button>
    </div>
  )
}
