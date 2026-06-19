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

export type BindingSlot = TicTacToeSlot | GeneralSlot  | RPSSlot

export const RPS_SLOTS = [
  { key: 'rps_start', label: 'RPS Start Game' },

  { key: 'intro', label: 'Intro' },

  { key: 'rock_win', label: 'Rock Win' },
  { key: 'rock_lose', label: 'Rock Lose' },
  { key: 'rock_draw', label: 'Rock Draw' },

  { key: 'paper_win', label: 'Paper Win' },
  { key: 'paper_lose', label: 'Paper Lose' },
  { key: 'paper_draw', label: 'Paper Draw' },

  { key: 'scissors_win', label: 'Scissors Win' },
  { key: 'scissors_lose', label: 'Scissors Lose' },
  { key: 'scissors_draw', label: 'Scissors Draw' },
] as const

export type RPSSlot = (typeof RPS_SLOTS)[number]['key']

// slot key -> cue id (null = unlinked)
export type Bindings = Record<BindingSlot, string | null>

export const EMPTY_BINDINGS: Bindings = {
  start: null,
  place: null,
  win: null,
  lose: null,
  draw: null,
  idle: null,
  rps_start: null,
  intro: null,
  rock_win: null,
  rock_lose: null,
  rock_draw: null,
  paper_win: null,
  paper_lose: null,
  paper_draw: null,
  scissors_win: null,
  scissors_lose: null,
  scissors_draw: null
}