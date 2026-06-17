export interface HotCue {
  id: string // also the IndexedDB key for this clip's file
  key: string
  startTime: number // offset within the clip
  title: string // short name, e.g. "Introduction"
  label: string // longer text, e.g. the first lines of what's said
  fileName: string
}

// A game declares named "slots" — the moments where a linked clip should play.
// Each slot is bound to a cue id (or null when nothing is linked yet).
export const TIC_TAC_TOE_SLOTS = [
  { key: 'start', label: 'Start game' },
  { key: 'place', label: 'Yoda places mark' },
  { key: 'win', label: 'You win' },
  { key: 'lose', label: 'Yoda wins' },
  { key: 'draw', label: 'Draw' },
] as const

export type TicTacToeSlot = (typeof TIC_TAC_TOE_SLOTS)[number]['key']

// General (cross-game) slots, shown outside any single game's panel.
export const GENERAL_SLOTS = [
  { key: 'idle', label: 'Idle' },
] as const

export type GeneralSlot = (typeof GENERAL_SLOTS)[number]['key']

export type BindingSlot = TicTacToeSlot | GeneralSlot

// slot key -> cue id (null = unlinked)
export type Bindings = Record<BindingSlot, string | null>

export const EMPTY_BINDINGS: Bindings = {
  start: null,
  place: null,
  win: null,
  lose: null,
  draw: null,
  idle: null,
}
