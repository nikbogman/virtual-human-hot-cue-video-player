import { useCallback, useEffect, useRef, useState } from 'react'

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

// Fallback delay for dropping Yoda's mark when no "placing" clip is linked.
const THINK_DELAY = 7000
// How long the outcome clip plays before the replay prompt (Yes/No) appears.
const END_CHOICES_DELAY = 12000
const COMPUTER_MARK_SRC = '/lightsaberGreen.png'
const HUMAN_MARK_SRC = '/lightsaberRed.png'
const CHOICE_BUTTON_CLASS =
  'h-[100px] w-[200px] cursor-pointer rounded-xl bg-white/[0.98] text-[2.5rem] font-bold text-[#616640] ' +
  'shadow-[0_4px_20px_rgba(6,82,11,0.35)] hover:bg-[#9bb38cb6]'
const CELL_CLASS =
  'grid h-[100px] w-[100px] cursor-pointer place-items-center border-0 bg-[rgba(169,171,156,0.5)] p-0'

function emptyBoard() {
  return Array<string>(9).fill('')
}

function getWinner(board: string[]) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

type GameClip = { src: string; startTime: number } | null

interface Props {
  // Clips linked to game moments, played full-screen when reached. `start`
  // plays once at launch; `idle` ping-pongs; the rest are one-shots.
  clips?: {
    start: GameClip
    place: GameClip
    win: GameClip
    lose: GameClip
    draw: GameClip
    idle: GameClip
  } | null
}

// The game runs as a small state machine; each phase decides which clip plays:
//   start   -> Start clip (opening), then placing
//   placing -> Yoda's "places mark" clip; mark drops when it ends
//   idle    -> looping idle clip while waiting for the human
//   over    -> terminal win/lose/draw clip, held on its last frame
type Phase = 'start' | 'placing' | 'idle' | 'over'

// What the background video is currently playing. `bounce` clips ping-pong
// (forward, then reverse, then forward) so they never hard-cut between frames.
type Active = { src: string; startTime: number; bounce: boolean; muted: boolean } | null

function endMessage(board: string[]) {
  const winner = getWinner(board)
  if (winner === 'O') return 'You win!'
  if (winner === 'X') return 'Yoda wins!'
  if (board.every((cell) => cell)) return 'Draw!'
  return null
}

function outcomeKey(board: string[]): 'win' | 'lose' | 'draw' | null {
  const winner = getWinner(board)
  if (winner === 'O') return 'win'
  if (winner === 'X') return 'lose'
  if (board.every((cell) => cell)) return 'draw'
  return null
}

function markVisual(mark: string) {
  if (mark === 'X') return { src: COMPUTER_MARK_SRC, alt: 'Computer lightsaber' }
  if (mark === 'O') return { src: HUMAN_MARK_SRC, alt: 'User lightsaber' }
  return null
}

export default function TicTacToe({ clips }: Props) {
  const [board, setBoard] = useState(emptyBoard)
  const [humanTurn, setHumanTurn] = useState(false)
  const [status, setStatus] = useState('')
  const [showChoices, setShowChoices] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  // The clip the full-screen background video is currently playing.
  const [active, setActive] = useState<Active>(null)

  const boardRef = useRef(board)
  const backgroundRef = useRef<HTMLVideoElement>(null)
  const thinkTimerRef = useRef<number | undefined>(undefined)
  const choiceTimerRef = useRef<number | undefined>(undefined)
  const phaseRef = useRef<Phase>('start')
  const reverseRafRef = useRef<number | undefined>(undefined)
  const reversingRef = useRef(false)

  // Read latest props through a ref so the flow callbacks stay stable across
  // binding changes (otherwise the opening-move effect would re-run mid-game).
  // Initialised with the first-render value, so clips are available at mount.
  const clipsRef = useRef(clips)
  useEffect(() => {
    clipsRef.current = clips
  }, [clips])

  useEffect(() => {
    boardRef.current = board
  }, [board])

  const finishGame = useCallback((message: string) => {
    phaseRef.current = 'over'
    setStatus(message)
    setHumanTurn(false)
    const key = outcomeKey(boardRef.current)
    const clip = key ? clipsRef.current?.[key] : null
    if (clip) setActive({ ...clip, bounce: false, muted: false })
    // Let the outcome clip play before offering a replay.
    clearTimeout(choiceTimerRef.current)
    choiceTimerRef.current = window.setTimeout(
      () => setShowChoices(true),
      END_CHOICES_DELAY,
    )
  }, [])

  // Human's turn: loop the idle clip while we wait for a click. With no idle
  // clip linked, the previous clip's last frame simply stays on screen.
  const goIdle = useCallback(() => {
    phaseRef.current = 'idle'
    setStatus('')
    setHumanTurn(true)
    const idle = clipsRef.current?.idle
    if (idle) setActive({ ...idle, bounce: true, muted: true })
  }, [])

  const placeComputerMark = useCallback(() => {
    if (phaseRef.current !== 'placing') return

    const prev = boardRef.current
    const empty = prev.map((cell, i) => (cell ? -1 : i)).filter((i) => i >= 0)
    if (empty.length === 0) return

    const next = [...prev]
    next[empty[Math.floor(Math.random() * empty.length)]] = 'X'
    boardRef.current = next
    setBoard(next)

    const msg = endMessage(next)
    if (msg) finishGame(msg)
    else goIdle()
  }, [finishGame, goIdle])

  // Yoda's turn: play the "places mark" clip; the mark drops when it ends. With
  // no placing clip linked, fall back to a fixed think delay.
  const goPlacing = useCallback(() => {
    clearTimeout(thinkTimerRef.current)
    phaseRef.current = 'placing'
    setHumanTurn(false)
    const place = clipsRef.current?.place
    if (place) {
      setActive({ ...place, bounce: false, muted: false })
    } else {
      thinkTimerRef.current = window.setTimeout(placeComputerMark, THINK_DELAY)
    }
  }, [placeComputerMark])

  // Opening: play the Start clip, then hand off to Yoda's first placement.
  const startOpening = useCallback(() => {
    clearTimeout(thinkTimerRef.current)
    phaseRef.current = 'start'
    const start = clipsRef.current?.start
    if (start) setActive({ ...start, bounce: false, muted: false })
    else goPlacing()
  }, [goPlacing])

  const startNewGame = useCallback(() => {
    clearTimeout(choiceTimerRef.current)
    setShowChoices(false)
    setShowGrid(true)
    const fresh = emptyBoard()
    boardRef.current = fresh
    setBoard(fresh)
    setStatus('')
    startOpening()
  }, [startOpening])

  useEffect(() => {
    startOpening()
    return () => {
      clearTimeout(thinkTimerRef.current)
      clearTimeout(choiceTimerRef.current)
    }
  }, [startOpening])

  // Drive playback for the active clip. Also covers same-src transitions where
  // onLoadedMetadata wouldn't re-fire. Linked clips can have audio — the monitor
  // window has already been interacted with (Click to sync), so this is allowed.
  useEffect(() => {
    const vid = backgroundRef.current
    if (!vid || !active) return
    if (reverseRafRef.current) cancelAnimationFrame(reverseRafRef.current)
    reversingRef.current = false
    vid.muted = active.muted
    vid.currentTime = active.startTime
    void vid.play()
    return () => {
      if (reverseRafRef.current) cancelAnimationFrame(reverseRafRef.current)
      reversingRef.current = false
    }
  }, [active])

  // Reverse half of the ping-pong: play forward natively, then scrub backward to
  // the start with rAF, then resume forward — so the idle clip never hard-cuts.
  function startReverse(startTime: number) {
    const vid = backgroundRef.current
    if (!vid || reversingRef.current) return
    reversingRef.current = true
    vid.pause()
    let last = performance.now()
    const step = (now: number) => {
      const v = backgroundRef.current
      if (!v) return
      const next = v.currentTime - (now - last) / 1000
      last = now
      if (next <= startTime) {
        v.currentTime = startTime
        reversingRef.current = false
        void v.play() // forward again; the next end triggers another bounce
        return
      }
      v.currentTime = next
      reverseRafRef.current = requestAnimationFrame(step)
    }
    reverseRafRef.current = requestAnimationFrame(step)
  }

  // Catch the end of a bounce clip a touch early — some clips stall on the last
  // frame without firing `ended`, so we don't rely on it alone.
  function onActiveTimeUpdate() {
    const vid = backgroundRef.current
    if (!vid || !active?.bounce || reversingRef.current) return
    if (vid.duration && vid.currentTime >= vid.duration - 0.12) {
      startReverse(active.startTime)
    }
  }

  function onActiveEnded() {
    if (active?.bounce) {
      startReverse(active.startTime)
      return
    }
    if (phaseRef.current === 'start') goPlacing()
    else if (phaseRef.current === 'placing') placeComputerMark()
    // over holds its last frame — nothing to do.
  }

  function onCellClick(index: number) {
    if (!humanTurn || board[index]) return

    const next = [...board]
    next[index] = 'O'
    boardRef.current = next
    setBoard(next)

    const msg = endMessage(next)
    if (msg) finishGame(msg)
    else goPlacing()
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video
        ref={backgroundRef}
        className="fixed inset-0 z-0 h-full w-full"
        src={active?.src}
        autoPlay
        playsInline
        onLoadedMetadata={() => {
          const vid = backgroundRef.current
          if (!vid || !active) return
          vid.muted = active.muted
          vid.currentTime = active.startTime
          void vid.play()
        }}
        onTimeUpdate={onActiveTimeUpdate}
        onEnded={onActiveEnded}
      />

      <p className="fixed left-1/2 top-[10%] z-[3] min-h-16 -translate-x-1/2 text-6xl text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
        {status}
      </p>

      <div
        className={`${showChoices ? 'flex' : 'hidden'} fixed inset-x-0 bottom-0 top-[-40%] z-10 items-center justify-center gap-8`}
      >
        <button type="button" className={CHOICE_BUTTON_CLASS} onClick={startNewGame}>
          Yes
        </button>
        <button
          type="button"
          className={CHOICE_BUTTON_CLASS}
          onClick={() => {
            setShowChoices(false)
            setShowGrid(false)
            setStatus('')
            // Leave the game on the idle clip rather than a frozen frame.
            const idle = clipsRef.current?.idle
            if (idle) setActive({ ...idle, bounce: true, muted: true })
          }}
        >
          No
        </button>
      </div>

      {showGrid && (
        <div className="fixed left-1/2 top-[80%] z-[1] grid -translate-x-1/2 -translate-y-1/2 grid-cols-[repeat(3,100px)] grid-rows-[repeat(3,100px)] gap-1">
          {board.map((mark, i) => (
            <button
              key={i}
              type="button"
              className={`${CELL_CLASS}${mark ? ' cursor-default' : ''}`}
              onClick={() => onCellClick(i)}
            >
              {mark ? (
                <img
                  className="h-[84px] w-[84px] select-none object-contain pointer-events-none"
                  src={markVisual(mark)?.src}
                  alt={markVisual(mark)?.alt ?? ''}
                  draggable={false}
                />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
