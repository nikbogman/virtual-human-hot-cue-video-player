import { useEffect, useRef, useState } from 'react'
import type { HotCue } from '../types'
import { getVideo } from '../lib/videoDB'

export function useCueBlobUrls(cues: HotCue[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const urlsRef = useRef(urls)
  urlsRef.current = urls

  useEffect(() => {
    let cancelled = false
    const current = urlsRef.current
    const ids = new Set(cues.map((c) => c.id))
    const stale = Object.keys(current).filter((id) => !ids.has(id))
    stale.forEach((id) => URL.revokeObjectURL(current[id]))
    const missing = cues.filter((c) => !current[c.id])

    void Promise.all(
      missing.map(async (c) => {
        const file = await getVideo(c.id)
        return file ? ([c.id, URL.createObjectURL(file)] as const) : null
      }),
    ).then((entries) => {
      if (cancelled) return
      setUrls((prev) => {
        const next = { ...prev }
        stale.forEach((id) => delete next[id])
        for (const e of entries) if (e) next[e[0]] = e[1]
        return next
      })
    })

    return () => { cancelled = true }
  }, [cues])

  useEffect(() => () => {
    Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u))
  }, [])

  return urls
}
