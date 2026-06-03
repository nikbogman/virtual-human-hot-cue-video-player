import { useState, useEffect } from 'react'

export interface CuePosition {
  x: number
  y: number
}

export interface CueLink {
  source: string
  target: string
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// Owns the node-graph layout: per-cue canvas positions and directed "next cue"
// links between cues. Both are keyed by HotCue.id and persisted to localStorage.
export function useCueGraph() {
  const [positions, setPositions] = useState<Record<string, CuePosition>>(() => load('cuePositions', {}))
  const [links, setLinks] = useState<CueLink[]>(() => load('cueLinks', []))

  useEffect(() => {
    localStorage.setItem('cuePositions', JSON.stringify(positions))
  }, [positions])

  useEffect(() => {
    localStorage.setItem('cueLinks', JSON.stringify(links))
  }, [links])

  function setPosition(id: string, pos: CuePosition) {
    setPositions((prev) => ({ ...prev, [id]: pos }))
  }

  function addLink(source: string, target: string) {
    if (source === target) return
    setLinks((prev) =>
      prev.some((l) => l.source === source && l.target === target) ? prev : [...prev, { source, target }],
    )
  }

  function removeLink(source: string, target: string) {
    setLinks((prev) => prev.filter((l) => !(l.source === source && l.target === target)))
  }

  // Drop a cue's position and any links touching it (called when a cue is deleted).
  function removeNode(id: string) {
    setPositions((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setLinks((prev) => prev.filter((l) => l.source !== id && l.target !== id))
  }

  function clear() {
    setPositions({})
    setLinks([])
  }

  return { positions, links, setPosition, addLink, removeLink, removeNode, clear }
}
