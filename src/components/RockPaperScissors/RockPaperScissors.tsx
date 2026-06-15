import { useState } from 'react'
import { useHandGesture } from './useHandGesture'

const MOVES = ['rock', 'paper', 'scissors'] as const

type Move = (typeof MOVES)[number]

function getRandomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)]
}

function getResult(user: Move, yoda: Move) {
  if (user === yoda) return 'Draw'

  if (
    (user === 'rock' && yoda === 'scissors') ||
    (user === 'paper' && yoda === 'rock') ||
    (user === 'scissors' && yoda === 'paper')
  ) {
    return 'You Win'
  }

  return 'Yoda Wins'
}

export default function RockPaperScissors() {
  const gesture = useHandGesture()

  const [userMove, setUserMove] = useState('')
  const [yodaMove, setYodaMove] = useState('')
  const [result, setResult] = useState('')

  function playRound() {
    if (
      gesture !== 'rock' &&
      gesture !== 'paper' &&
      gesture !== 'scissors'
    ) {
      alert('Show Rock, Paper, or Scissors first')
      return
    }

    const yoda = getRandomMove()

    setUserMove(gesture)
    setYodaMove(yoda)

    const outcome = getResult(gesture, yoda)
    setResult(outcome)

    // Later:
    // if (outcome === 'You Win') play losing Yoda video
    // if (outcome === 'Yoda Wins') play winning Yoda video
    // if (outcome === 'Draw') play draw video
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
      }}
    >
      <h2>Rock Paper Scissors</h2>

      <p>
        <strong>Detected:</strong> {gesture || 'No gesture'}
      </p>

      <button
        onClick={playRound}
        style={{
          padding: '10px 20px',
          cursor: 'pointer',
          marginBottom: '10px',
        }}
      >
        Shoot
      </button>

      <p>
        <strong>You:</strong> {userMove}
      </p>

      <p>
        <strong>Yoda:</strong> {yodaMove}
      </p>

      <p>
        <strong>Result:</strong> {result}
      </p>
    </div>
  )
}