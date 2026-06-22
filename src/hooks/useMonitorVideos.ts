import { useEffect, useRef, useState } from 'react'
import { getVideo } from '../lib/videoDB'

export function useMonitorVideos() {
  const [clips, setClips] = useState<{ id: string; src: string }[]>([])
  const urlCacheRef = useRef<Record<string, string>>({})

  const load = async () => {
    const cues: { id: string }[] = JSON.parse(localStorage.getItem('hotCues') ?? '[]')
    const result: { id: string; src: string }[] = []
    for (const { id } of cues) {
      if (!urlCacheRef.current[id]) {
        const file = await getVideo(id)
        if (file) urlCacheRef.current[id] = URL.createObjectURL(file)
      }
      const src = urlCacheRef.current[id]
      if (src) result.push({ id, src })
    }
    setClips(result)
  }

  useEffect(() => {
    void load()
    return () => {
      Object.values(urlCacheRef.current).forEach((u) => URL.revokeObjectURL(u))
    }
  }, [])

  return { clips, reload: load }
}
