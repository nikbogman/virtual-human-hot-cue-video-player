export interface HotCue {
  id: string
  key: string
  startTime: number
  title: string
  label: string
  fileName: string
}

export const GENERAL_SLOTS = [
  { key: 'idle', label: 'Idle' },
  { key: 'welcome', label: 'Welcome' },
] as const

export const TIC_TAC_TOE_SLOTS = [
  { key: 'tictactoe-start', label: 'Start' },
  { key: 'tictactoe-turn', label: 'YodaTurn' },
  { key: 'tictactoe-win', label: 'PlayerWin' },
  { key: 'tictactoe-lose', label: 'YodaWin' },
  { key: 'tictactoe-draw', label: 'Draw' },
] as const

export const RPS_SLOTS = [
  { key: 'rps_start', label: 'Start' },
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

export const POKE_SLOTS = [
  { key: 'poke-bg', label: 'BgPoked' },
  { key: 'poke-yoda', label: 'YodaPoked' },
] as const


export const SLOT_GROUPS = [
  { label: 'General', slots: GENERAL_SLOTS },
  { label: 'Poke', slots: POKE_SLOTS },
  { label: 'Tic-Tac-Toe', slots: TIC_TAC_TOE_SLOTS },
  { label: 'Rock Paper Scissors', slots: RPS_SLOTS },
] as const

export const ALL_BINDING_SLOTS = [...GENERAL_SLOTS, ...POKE_SLOTS, ...TIC_TAC_TOE_SLOTS, ...RPS_SLOTS] as const

export type GameSlot = (typeof ALL_BINDING_SLOTS)[number]
export type GameSlotKey = GameSlot['key']
export type GameBindings = Record<GameSlotKey, string | null>


export type GameClip = { src: string; startTime: number } | null

export type RPSClips = {
  intro: GameClip
  rock_win: GameClip
  rock_lose: GameClip
  rock_draw: GameClip
  paper_win: GameClip
  paper_lose: GameClip
  paper_draw: GameClip
  scissors_win: GameClip
  scissors_lose: GameClip
  scissors_draw: GameClip
}

export type GameClips = {
  start: GameClip
  place: GameClip
  win: GameClip
  lose: GameClip
  draw: GameClip
  idle: GameClip
}

export type VideoSyncMessage =
  | { type: 'play'; videoId: string | null; currentTime: number; isIdle: boolean }
  | { type: 'pause'; videoId: string | null; currentTime: number; isIdle: boolean }
  | { type: 'seek'; videoId: string | null; currentTime: number; isIdle: boolean }
  | { type: 'send_initial_state'; videoId: string | null; currentTime: number; isPlaying: boolean; isIdle: boolean }
  | { type: 'request_initial_state' }
  | { type: 'show_tic_tac_toe'; videoId: string | null; startTime: number }
  | { type: 'show_welcome'; videoId: string | null; startTime: number }
  | { type: 'show_rock_paper_scissors'; videoId: string | null; startTime: number }
  | { type: 'titles_map'; mapping: { poked: string | null; touched_screen: string | null } }
  | { type: 'game_bindings'; mapping: Record<string, { id: string; startTime: number } | null> }
