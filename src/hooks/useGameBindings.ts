import { useEffect, useRef, useState } from 'react'
import {
  EMPTY_BINDINGS,
  type Bindings,
  type BindingSlot,
} from '../types'

const STORAGE_KEY = 'gameBindings'

function sanitize(value: unknown): Bindings {
  const next = { ...EMPTY_BINDINGS }
  if (value && typeof value === 'object') {
    for (const slot of Object.keys(next) as BindingSlot[]) {
      const v = (value as Record<string, unknown>)[slot]
      if (typeof v === 'string') next[slot] = v
    }
  }
  return next
}

// Explicit clip -> slot mapping (per-game + general), persisted to localStorage.
// Kept separate from a cue's `title` so links survive renames and aren't guessed.
export function useGameBindings() {
  const [bindings, setBindings] = useState<Bindings>(EMPTY_BINDINGS)
  const loadedRef = useRef(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) setBindings(sanitize(JSON.parse(saved)))
      } catch {}
      loadedRef.current = true
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
  }, [bindings])

  function setBinding(slot: BindingSlot, cueId: string | null) {
    setBindings((prev) => ({ ...prev, [slot]: cueId }))
  }

  // Drop links to cues that no longer exist (e.g. after delete / import).
  function pruneBindings(validIds: Set<string>) {
    setBindings((prev) => {
      let changed = false
      const next = { ...prev }
      for (const slot of Object.keys(next) as BindingSlot[]) {
        if (next[slot] && !validIds.has(next[slot]!)) {
          next[slot] = null
          changed = true
        }
      }
      return changed ? next : prev
    })
  }

  function replaceBindings(value: unknown) {
    setBindings(sanitize(value))
  }

  return { bindings, setBinding, pruneBindings, replaceBindings }
}
