import { useState, useEffect, useRef } from 'react'
import type { HotCue } from '../types'

export function useHotCues(onCuePress: (cue: HotCue) => void) {
  const [cues, setCues] = useState<HotCue[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const cuesRef = useRef(cues)
  const editingIndexRef = useRef(editingIndex)
  const onCuePressRef = useRef(onCuePress)
  const cuesLoadedRef = useRef(false)

  useEffect(() => {
    cuesRef.current = cues
  }, [cues])

  useEffect(() => {
    editingIndexRef.current = editingIndex
  }, [editingIndex])

  useEffect(() => {
    onCuePressRef.current = onCuePress
  }, [onCuePress])

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('hotCues') ?? '[]')
        if (Array.isArray(saved)) setCues(saved)
      } catch {}
      cuesLoadedRef.current = true
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!cuesLoadedRef.current) return
    localStorage.setItem('hotCues', JSON.stringify(cues))
  }, [cues])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        const idx = editingIndexRef.current
        if (idx === null) return
        setCues((prev) => {
          if (!prev[idx]?.key) {
            const next = [...prev]
            next.splice(idx, 1)
            return next
          }
          return prev
        })
        setEditingIndex(null)
        return
      }

      const idx = cuesRef.current.findIndex((c) => c.key === e.key.toLowerCase())
      if (idx === -1) return
      onCuePressRef.current(cuesRef.current[idx])
      setActiveIndex(idx)
      setTimeout(() => setActiveIndex(null), 300)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  function closeEdit() {
    const idx = editingIndexRef.current
    if (idx === null) return
    if (!cuesRef.current[idx]?.key) {
      setCues((prev) => {
        const next = [...prev]
        next.splice(idx, 1)
        return next
      })
    }
    setEditingIndex(null)
  }

  function updateCue(index: number, patch: Partial<HotCue>) {
    setCues((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function addCue() {
    const idx = editingIndexRef.current
    const current = cuesRef.current
    const base = idx !== null && !current[idx]?.key ? current.filter((_, i) => i !== idx) : [...current]
    const newCues = [...base, { key: '', startTime: 0, label: '' }]
    setCues(newCues)
    setEditingIndex(newCues.length - 1)
  }

  function deleteCue(index: number) {
    setCues((prev) => prev.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  function clearCues() {
    setCues([])
    setEditingIndex(null)
  }

  function exportCues() {
    const blob = new Blob([JSON.stringify(cuesRef.current, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hot-cues.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importCues(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!Array.isArray(data)) return
        const valid = data.filter(
          (item) =>
            typeof item.key === 'string' &&
            typeof item.startTime === 'number' &&
            typeof item.label === 'string'
        )
        setCues(valid)
        setEditingIndex(null)
      } catch {}
    }
    reader.readAsText(file)
  }

  return { cues, editingIndex, setEditingIndex, activeIndex, closeEdit, updateCue, addCue, deleteCue, clearCues, exportCues, importCues }
}
