import { useEffect, useRef, useState } from 'react'
import type { RPSClips } from '../../types'
import { useHandGesture } from './useHandGesture'

const MOVES = ['rock', 'paper', 'scissors'] as const
type Move = (typeof MOVES)[number]

function randomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)]
}

function getResult(user: Move, yoda: Move) {
  if (user === yoda) return 'draw'
  if (
    (user === 'rock' && yoda === 'scissors') ||
    (user === 'paper' && yoda === 'rock') ||
    (user === 'scissors' && yoda === 'paper')
  ) return 'win'
  return 'lose'
}

export function useRPSGame(clips: RPSClips) {
  const gesture = useHandGesture()

  const [userScore, setUserScore] = useState(0)
  const [yodaScore, setYodaScore] = useState(0)
  const [round, setRound] = useState(0)
  const [userMove, setUserMove] = useState<Move | ''>('')
  const [yodaMove, setYodaMove] = useState<Move | ''>('')
  const [roundResult, setRoundResult] = useState('')
  const [currentClip, setCurrentClip] = useState<string | null>(null)

  const gameOver = userScore >= 2 || yodaScore >= 2 || round >= 3

  const gameOverRef = useRef(false)
  const lastGestureRef = useRef<string | null>(null)
  const holdRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (clips.intro?.src) setCurrentClip(clips.intro.src)
    setUserScore(0)
    setYodaScore(0)
    setRound(0)
    setUserMove('')
    setYodaMove('')
    setRoundResult('')
    gameOverRef.current = false
  }, [clips.intro])

  function playRound(g: Move) {
    if (gameOverRef.current) return

    const yoda = randomMove()
    const result = getResult(g, yoda)

    setUserMove(g)
    setYodaMove(yoda)

    const clipKey = `${g}_${result}` as keyof RPSClips
    const clip = clips[clipKey]
    if (clip?.src) setCurrentClip(clip.src)

    if (result === 'win') {
      setUserScore((s) => {
        const next = s + 1
        if (next >= 2) gameOverRef.current = true
        return next
      })
      setRoundResult('You Win ')
    } else if (result === 'lose') {
      setYodaScore((s) => {
        const next = s + 1
        if (next >= 2) gameOverRef.current = true
        return next
      })
      setRoundResult('Yoda Wins ')
    } else {
      setRoundResult('Draw 🤝')
    }

    setRound((r) => {
      const next = r + 1
      if (next >= 3) gameOverRef.current = true
      return next
    })
  }

  useEffect(() => {
    if (!gesture || (gesture !== 'rock' && gesture !== 'paper' && gesture !== 'scissors')) return
    if (gesture === lastGestureRef.current) return
    lastGestureRef.current = gesture

    if (holdRef.current) clearTimeout(holdRef.current)

    holdRef.current = setTimeout(() => {
      lastGestureRef.current = null
      playRound(gesture as Move)
    }, 800)

    return () => {
      if (holdRef.current) clearTimeout(holdRef.current)
    }
  }, [gesture])

  function reset() {
    setUserScore(0)
    setYodaScore(0)
    setRound(0)
    setUserMove('')
    setYodaMove('')
    setRoundResult('')
    gameOverRef.current = false
    lastGestureRef.current = null
    if (clips.intro?.src) setCurrentClip(clips.intro.src)
  }

  return { gesture, userScore, yodaScore, userMove, yodaMove, roundResult, currentClip, gameOver, reset }
}
