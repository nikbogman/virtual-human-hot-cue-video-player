import { useCallback, useEffect, useRef, useState } from 'react'

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

const THINK_DELAY = 7000
const OPENING_THINK_DELAY = 13000
const COMPUTER_MARK_SRC = '/lightsaberGreen.png'
const HUMAN_MARK_SRC = '/lightsaberRed.png'

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

interface Props {
  backgroundCue?: { startTime: number; version: number } | null
  backgroundSrc?: string
}

function endMessage(board: string[]) {
  const winner = getWinner(board)
  if (winner) return winner + ' wins!'
  if (board.every((cell) => cell)) return 'Draw!'
  return null
}

function markVisual(mark: string) {
  if (mark === 'X') return { src: COMPUTER_MARK_SRC, alt: 'Computer lightsaber' }
  if (mark === 'O') return { src: HUMAN_MARK_SRC, alt: 'User lightsaber' }
  return null
}

export default function TicTacToe({ backgroundCue, backgroundSrc }: Props) {
  const [board, setBoard] = useState(emptyBoard)
  const [humanTurn, setHumanTurn] = useState(false)
  const [status, setStatus] = useState('')
  const [showChoices, setShowChoices] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const gameOverRef = useRef(false)
  const boardRef = useRef(board)
  const backgroundRef = useRef<HTMLVideoElement>(null)
  const thinkTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    boardRef.current = board
  }, [board])

  const finishGame = useCallback((message: string) => {
    gameOverRef.current = true
    setStatus(message)
    setShowChoices(true)
    setHumanTurn(false)
  }, [])

  const runComputerTurn = useCallback((delay = THINK_DELAY) => {
    clearTimeout(thinkTimerRef.current)
    thinkTimerRef.current = window.setTimeout(() => {
      if (gameOverRef.current) return

      const prev = boardRef.current
      const empty = prev
        .map((cell, i) => (cell ? -1 : i))
        .filter((i) => i >= 0)
      if (empty.length === 0) return

      const next = [...prev]
      next[empty[Math.floor(Math.random() * empty.length)]] = 'X'
      boardRef.current = next
      setBoard(next)

      const msg = endMessage(next)
      if (msg) finishGame(msg)
      else {
        setHumanTurn(true)
        setStatus('')
      }
    }, delay)
  }, [finishGame])

  const startNewGame = useCallback(() => {
    gameOverRef.current = false
    setShowChoices(false)
    setShowGrid(true)
    const fresh = emptyBoard()
    boardRef.current = fresh
    setBoard(fresh)
    setStatus('')
    setHumanTurn(false)
    runComputerTurn(OPENING_THINK_DELAY)
  }, [runComputerTurn])

  useEffect(() => {
    runComputerTurn(OPENING_THINK_DELAY)
    return () => clearTimeout(thinkTimerRef.current)
  }, [runComputerTurn])

  useEffect(() => {
    const vid = backgroundRef.current
    if (!vid || !backgroundCue) return
    vid.currentTime = backgroundCue.startTime
    void vid.play()
  }, [backgroundCue])

  function onCellClick(index: number) {
    if (gameOverRef.current || !humanTurn || board[index]) return

    const next = [...board]
    next[index] = 'O'
    boardRef.current = next
    setBoard(next)

    const msg = endMessage(next)
    if (msg) {
      finishGame(msg)
      return
    }
    setHumanTurn(false)
    runComputerTurn()
  }

  return (
    <div className="ttt-root">
      <video
        ref={backgroundRef}
        className="ttt-bg"
        src={backgroundSrc}
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={() => {
          if (!backgroundCue || !backgroundRef.current) return
          backgroundRef.current.currentTime = backgroundCue.startTime
          void backgroundRef.current.play()
        }}
      />

      <p className="ttt-status">{status}</p>

      <div className={`ttt-choices${showChoices ? '' : ' ttt-choices--hidden'}`}>
        <button type="button" className="ttt-choice-btn" onClick={startNewGame}>
          Yes
        </button>
        <button
          type="button"
          className="ttt-choice-btn"
          onClick={() => {
            setShowChoices(false)
            setShowGrid(false)
            setStatus('')
          }}
        >
          No
        </button>
      </div>

      {showGrid && (
        <div className="ttt-grid">
          {board.map((mark, i) => (
            <button
              key={i}
              type="button"
              className={`ttt-cell${mark ? ' ttt-cell--taken' : ''}`}
              onClick={() => onCellClick(i)}
            >
              {mark ? (
                <img
                  className="ttt-saber"
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
