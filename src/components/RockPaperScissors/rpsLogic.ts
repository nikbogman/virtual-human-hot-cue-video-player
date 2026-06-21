export type Move = "rock" | "paper" | "scissors"

export type Result = "win" | "lose" | "draw"

export function compareMoves(
  player: Move,
  avatar: Move
): Result {
  if (player === avatar) return "draw"

  if (
    (player === "rock" && avatar === "scissors") ||
    (player === "paper" && avatar === "rock") ||
    (player === "scissors" && avatar === "paper")
  ) {
    return "win"
  }

  return "lose"
}