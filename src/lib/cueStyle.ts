// Shared styling for cue cards across the list and graph views.

export const cueCardBase =
  'relative flex flex-col gap-1 p-2 border rounded w-44 h-28 cursor-pointer overflow-hidden'

// Outline state for a cue card: a bright ring when it's the currently-playing
// cue, a dashed amber ring when it's an "up next" target of the playing cue.
export function cueHighlightClass(isPlaying: boolean, isNext: boolean): string {
  if (isPlaying) return 'bg-[#383838] border-white ring-2 ring-white/70'
  if (isNext) return 'bg-[#242424] border-dashed border-amber-400 ring-2 ring-amber-400/40'
  return 'bg-[#242424] border-[#3a3a3a] hover:border-[#555] hover:bg-[#2a2a2a] transition-colors'
}
