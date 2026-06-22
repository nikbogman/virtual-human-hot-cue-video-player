import type { RPSClips } from '../../types'
import { useRPSGame } from './useRPSGame'

export default function RockPaperScissors({ clips }: { clips: RPSClips }) {
  const {
    gesture, userScore, yodaScore, userMove, yodaMove,
    roundResult, currentClip, gameOver, reset,
  } = useRPSGame(clips)

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

        {gameOver && (
          <div style={{ marginTop: 10, color: 'gold' }}>
            <h3>Game Over</h3>
            <p>
              {userScore > yodaScore
                ? 'You Win 🏆'
                : yodaScore > userScore
                ? 'Yoda Wins 🧠'
                : "It's a Tie 🤝"}
            </p>
            <button onClick={reset}>Play Again</button>
          </div>
        )}
      </div>
    </>
  )
}
