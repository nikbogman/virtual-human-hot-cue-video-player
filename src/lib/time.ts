export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseTime(str: string): number | null {
  const s = str.trim()
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number)
    if (isNaN(m) || isNaN(sec) || m < 0 || sec < 0) return null
    return m * 60 + sec
  }
  const n = parseFloat(s)
  return isNaN(n) || n < 0 ? null : n
}
