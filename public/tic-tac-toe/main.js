// To win, a player needs to get 3 squares in a row, column, or diagonal
// Each number is a cell position (0 = top-left, 8 = bottom-right)
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
]

// Who plays next (X or O)
let currentPlayer = 'X'

// Whether the game is over
let gameOver = false

// Grab all 9 squares and the message above the grid
const cells = document.querySelectorAll('.cell')
const status = document.getElementById('status')

// Check if X or O has won
// Return 'X', 'O', or null if no winner yet
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

// When you click a square...
cells.forEach(function (cell) {
  cell.addEventListener('click', function () {
    // Ignore clicks if the game ended or this square is already taken
    if (gameOver || cell.textContent) return

    // Put X or O in the square
    cell.textContent = currentPlayer

    // Display the winner if there is one
    const winner = getWinner()
    if (winner) {
      gameOver = true
      status.textContent = winner + ' wins!'
      return
    }

    // Swap to the other player for the next click
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X'
  })
})
