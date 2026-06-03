import { useState, useEffect, useRef } from 'react'
import type { HotCue } from '../types'
import { storeVideo, deleteVideo, clearAllVideos } from '../lib/videoDB'

function nameWithoutExt(name: string): string {
  return name.replace(/\.[^./\\]+$/, '')
}

export function useHotCues(onCuePress: (cue: HotCue) => void) {
  const [cues, setCues] = useState<HotCue[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const cuesRef = useRef(cues)
  cuesRef.current = cues
  const editingIndexRef = useRef(editingIndex)
  editingIndexRef.current = editingIndex
  const onCuePressRef = useRef(onCuePress)
  onCuePressRef.current = onCuePress

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hotCues') ?? '[]')
      if (Array.isArray(saved)) setCues(saved)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('hotCues', JSON.stringify(cues))
  }, [cues])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
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
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
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

  // Each uploaded video becomes its own cue (1:1). The file is persisted to
  // IndexedDB under the cue id so the monitor window can read it independently.
  async function addClips(files: FileList | File[]) {
    const videos = Array.from(files).filter((f) => f.type.startsWith('video/'))
    if (videos.length === 0) return

    const newCues: HotCue[] = []
    for (const file of videos) {
      const id = crypto.randomUUID()
      await storeVideo(id, file)
      newCues.push({ id, key: '', startTime: 0, title: nameWithoutExt(file.name), label: '', fileName: file.name })
    }

    const firstNewIndex = cuesRef.current.length
    setCues([...cuesRef.current, ...newCues])
    setEditingIndex(firstNewIndex) // open the first new card to assign a key
  }

  function deleteCue(index: number) {
    const cue = cuesRef.current[index]
    if (cue) void deleteVideo(cue.id)
    setCues((prev) => prev.filter((_, i) => i !== index))
    setEditingIndex(null)
  }

  function clearCues() {
    void clearAllVideos()
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
      } catch {}
    }
    reader.readAsText(file)
  }

  return { cues, editingIndex, setEditingIndex, closeEdit, updateCue, addClips, deleteCue, clearCues, exportCues, importCues }
}
