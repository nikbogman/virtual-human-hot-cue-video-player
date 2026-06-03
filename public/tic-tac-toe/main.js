document.querySelectorAll('.cell').forEach(function (cell) {
  cell.addEventListener('click', function () {
    if (cell.textContent) return
    cell.textContent = 'X'
  })
})
