import { useEffect, useRef, useState } from 'react'
import { getVideo } from '../lib/videoDB'

export function useMonitorVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  const loadedIdRef = useRef<string | null>(null)
  const urlCacheRef = useRef<Record<string, string>>({})

  useEffect(() => () => {
    Object.values(urlCacheRef.current).forEach((u) => URL.revokeObjectURL(u))
  }, [])

  // Loads a clip into the blob URL cache; returns the URL or null on failure.
  const loadToCache = useRef(async (id: string): Promise<string | null> => {
    const cache = urlCacheRef.current
    if (cache[id]) return cache[id]
    const file = await getVideo(id)
    if (!file) return null
    const url = URL.createObjectURL(file)
    cache[id] = url
    return url
  }).current

  // Warm the cache for a clip without switching the active video.
  const preloadClip = useRef(async (id: string | null): Promise<void> => {
    if (id) await loadToCache(id)
  }).current

  // Load and display a clip; returns true once it is active.
  const ensureClip = useRef(async (id: string | null): Promise<boolean> => {
    if (!id || loadedIdRef.current === id) return true
    const url = await loadToCache(id)
    if (!url) return false
    loadedIdRef.current = id
    setVideoSrc(url)
    return true
  }).current

  const getClipUrl = useRef((id: string | null): string | undefined =>
    id ? urlCacheRef.current[id] : undefined
  ).current

  const getCurrentClipId = useRef((): string | null =>
    loadedIdRef.current
  ).current

  return { videoRef, videoSrc, preloadClip, ensureClip, getClipUrl, getCurrentClipId }
}
