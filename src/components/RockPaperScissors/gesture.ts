export type Move = "rock" | "paper" | "scissors" | null

export function detectGesture(landmarks: any[]): Move {
  if (!landmarks?.length) return null

  const tips = [8, 12, 16, 20]
  const pips = [6, 10, 14, 18]

  let extended = 0

  for (let i = 0; i < 4; i++) {
    if (landmarks[tips[i]].y < landmarks[pips[i]].y) {
      extended++
    }
  }

  if (extended === 0) return "rock"
  if (extended === 2) return "scissors"
  if (extended >= 4) return "paper"

  return null
}