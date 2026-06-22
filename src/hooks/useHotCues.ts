import { useState, useEffect, useRef } from 'react'
import type { HotCue } from '../types'

export function useHotCues(onCuePress: (cue: HotCue) => void) {
  const [cues, setCues] = useState<HotCue[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const cuesRef = useRef(cues)
  const editingIndexRef = useRef(editingIndex)
  const onCuePressRef = useRef(onCuePress)
  const cuesLoadedRef = useRef(false)

  cuesRef.current = cues
  editingIndexRef.current = editingIndex
  onCuePressRef.current = onCuePress

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hotCues') ?? '[]')
      if (Array.isArray(saved)) setCues(saved)
    } catch { }
    cuesLoadedRef.current = true
  }, [])

  useEffect(() => {
    if (!cuesLoadedRef.current) return
    localStorage.setItem('hotCues', JSON.stringify(cues))
  }, [cues])

  function handleKeyboardEvent(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    if (e.key === 'Escape') {
      if (editingIndexRef.current !== null) setEditingIndex(null)
      return
    }

    const idx = cuesRef.current.findIndex((c) => c.key === e.key.toLowerCase())
    if (idx === -1) return
    onCuePressRef.current(cuesRef.current[idx])
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardEvent)
    return () => document.removeEventListener('keydown', handleKeyboardEvent)
  }, [])

  function closeEdit() {
    if (editingIndexRef.current !== null) setEditingIndex(null)
  }

  function updateCue(index: number, patch: Partial<HotCue>) {
    setCues((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function addCues(newCues: HotCue[]) {
    const firstNewIndex = cuesRef.current.length
    setCues([...cuesRef.current, ...newCues])
    setEditingIndex(firstNewIndex)
  }

  function deleteCue(index: number) {
    setCues((prev) => prev.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  function clearCues() {
    setCues([])
    setEditingIndex(null)
  }

  function exportCues(extra?: Record<string, unknown>) {
    const payload = extra ? { cues: cuesRef.current, ...extra } : cuesRef.current
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hot-cues.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importCues(file: File, onExtra?: (data: Record<string, unknown>) => void) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        const data = Array.isArray(parsed) ? parsed : parsed?.cues
        if (!Array.isArray(data)) return
        const valid: HotCue[] = data
          .filter(
            (item) =>
              typeof item.id === 'string' &&
              typeof item.key === 'string' &&
              typeof item.startTime === 'number' &&
              typeof item.label === 'string' &&
              typeof item.fileName === 'string'
          )
          .map((item) => ({ ...item, title: typeof item.title === 'string' ? item.title : '' }))
        setCues(valid)
        setEditingIndex(null)
        if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') onExtra?.(parsed)
      } catch { }
    }
    reader.readAsText(file)
  }

  return { cues, editingIndex, setEditingIndex, closeEdit, updateCue, addCues, deleteCue, clearCues, exportCues, importCues }
}
