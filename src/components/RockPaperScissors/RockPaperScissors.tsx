import { useEffect, useRef, useState } from 'react'
import { useHandGesture } from './useHandGesture'
import type { RPSClips } from '../../pages/monitor'

const MOVES = ['rock', 'paper', 'scissors'] as const
type Move = (typeof MOVES)[number]

function getRandomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)]
}

function getResult(user: Move, yoda: Move) {
  if (user === yoda) return 'draw'

  if (
    (user === 'rock' && yoda === 'scissors') ||
    (user === 'paper' && yoda === 'rock') ||
    (user === 'scissors' && yoda === 'paper')
  ) {
    return 'win'
  }

  return 'lose'
}

export default function RockPaperScissors({ clips }: { clips: RPSClips }) {
  const gesture = useHandGesture()

  const [userScore, setUserScore] = useState(0)
  const [yodaScore, setYodaScore] = useState(0)

  const [userMove, setUserMove] = useState<Move | ''>('')
  const [yodaMove, setYodaMove] = useState<Move | ''>('')

  const [roundResult, setRoundResult] = useState('')
  const [currentClip, setCurrentClip] = useState<string | null>(null)

  const gameOverRef = useRef(false)
  const lastGestureRef = useRef<string | null>(null)
  const holdRef = useRef<NodeJS.Timeout | null>(null)

  // ---------- INTRO ----------
  useEffect(() => {
    if (clips.intro?.src) {
      setCurrentClip(clips.intro.src)
    }
  }, [clips])

  function playClip(src?: string) {
    if (!src) return
    setCurrentClip(src)
  }

  function playRound(g: Move) {
    if (gameOverRef.current) return

    const yoda = getRandomMove()
    const result = getResult(g, yoda)

    setUserMove(g)
    setYodaMove(yoda)

    const clipKey = `${g}_${result}` as keyof RPSClips
    const clip = clips[clipKey]

    playClip(clip?.src)

    if (result === 'win') {
      setUserScore((s) => {
        const next = s + 1
        if (next >= 2) gameOverRef.current = true
        return next
      })
      setRoundResult('You Win ')
    }

    if (result === 'lose') {
      setYodaScore((s) => {
        const next = s + 1
        if (next >= 2) gameOverRef.current = true
        return next
      })
      setRoundResult('Yoda Wins ')
    }

    if (result === 'draw') {
      setRoundResult('Draw 🤝')
    }
  }

  // ---------- GESTURE TRIGGER ----------
  useEffect(() => {
    if (!gesture) return

    if (
      gesture !== 'rock' &&
      gesture !== 'paper' &&
      gesture !== 'scissors'
    ) return

    if (gesture === lastGestureRef.current) return
    lastGestureRef.current = gesture

    if (holdRef.current) clearTimeout(holdRef.current)

    holdRef.current = setTimeout(() => {
      playRound(gesture as Move)
    }, 800)

    return () => {
      if (holdRef.current) clearTimeout(holdRef.current)
    }
  }, [gesture])

  // ---------- RESET ----------
  function reset() {
    setUserScore(0)
    setYodaScore(0)
    setUserMove('')
    setYodaMove('')
    setRoundResult('')
    gameOverRef.current = false

    if (clips.intro?.src) {
      setCurrentClip(clips.intro.src)
    }
  }

  return (
    <>
      <video
        key={currentClip}
        src={currentClip ?? undefined}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-contain"
      />

      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        width: '260px',
      }}>
        <h2>Best out of 3</h2>

        <p><strong>Detected:</strong> {gesture || 'none'}</p>

        <hr />

        <p>You: {userScore} | Yoda: {yodaScore}</p>

        <p>
          You: {userMove} <br />
          Yoda: {yodaMove}
        </p>

        <p><strong>Result:</strong> {roundResult}</p>

        {gameOverRef.current && (
          <div style={{ marginTop: 10, color: 'gold' }}>
            <h3>Game Over</h3>
            <p>{userScore > yodaScore ? 'You Win 🏆' : 'Yoda Wins 🧠'}</p>

            <button onClick={reset}>Play Again</button>
          </div>
        )}
      </div>
    </>
  )
}