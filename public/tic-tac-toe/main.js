// To win, a player needs to get 3 squares in a row, column, or diagonal
// Each number is a cell position (0 = top-left, 8 = bottom-right)
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
]

// Human plays O. Computer plays X.
let currentPlayer = 'O'
let gameOver = false

// How long to wait after you play before the computer moves (milliseconds)
const THINK_DELAY = 800

// Grab all 9 squares and the message above the grid
const cells = document.querySelectorAll('.cell')
const status = document.getElementById('status')

// Check if X or O has won. Returns 'X', 'O', or null (no winner yet).
function getWinner() {
  // Copy all 9 squares into one list, in order: top-left (0) to bottom-right (8)
  // Each entry is 'X', 'O', or '' (empty). Same numbering as WIN_LINES
  const board = Array.from(cells, (cell) => cell.textContent)

  // Try every winning line (each line is three cell numbers: a, b, c)
  for (const [a, b, c] of WIN_LINES) {
    // board[a] — first cell must not be empty (can't win on blank squares)
    // board[a] === board[b] — first and second match (both X or both O)
    // board[a] === board[c] — first and third match too, so all three are the same
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] // 'X' or 'O' — whoever completed this line
    }
  }
  return null // went through all 8 lines; no winner yet
}

// If someone won, stop the game and show the message
function checkForWinner() {
  const winner = getWinner()
  if (winner) {
    gameOver = true
    status.textContent = winner + ' wins!'
    return true
  }
  return false
}

// Computer (X): pick a random empty square and place X there
function computerMove() {
  if (gameOver) return

  const empty = Array.from(cells).filter((cell) => !cell.textContent)
  if (empty.length === 0) return

  const pick = empty[Math.floor(Math.random() * empty.length)]
  pick.textContent = 'X'

  checkForWinner()
}

// Wait a moment, then let the computer play
function scheduleComputerMove() {
  currentPlayer = 'X'

  setTimeout(function () {
    if (gameOver) return
    computerMove()
    if (!gameOver) {
      currentPlayer = 'O'
      status.textContent = ''
    }
  }, THINK_DELAY)
}

// Human (O): click a square to play
cells.forEach(function (cell) {
  cell.addEventListener('click', function () {
    // Only your turn when it's O, and only on empty squares
    if (gameOver || currentPlayer !== 'O' || cell.textContent) return

    cell.textContent = 'O'

    if (checkForWinner()) return

    // Pause so it feels like the computer is thinking, then place X
    currentPlayer = 'X'

    setTimeout(function () {
      if (gameOver) return
      computerMove()
      if (!gameOver) {
        currentPlayer = 'O'
        status.textContent = ''
      }
    }, THINK_DELAY)
  })
})

// X goes first — computer opens after the same thinking delay
currentPlayer = 'X'
scheduleComputerMove()
