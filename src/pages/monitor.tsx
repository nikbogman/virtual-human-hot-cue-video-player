import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { getVideo } from '../lib/videoDB'
// to test it only says detected:rock or paper or scissors
// import GestureTest from '../components/RockPaperScissors/GestureTest' 

import RockPaperScissors from '../components/RockPaperScissors/RockPaperScissors'

export default function Monitor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const syncedRef = useRef(false)
  const pendingRef = useRef<{ currentTime: number; play: boolean } | null>(null)

  // Which clip is currently loaded, and a cache of blob URLs by clip id.
  const loadedIdRef = useRef<string | null>(null)
  const urlCacheRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    channelRef.current = channel
    const urlCache = urlCacheRef.current

    // Load the requested clip into the player (no-op if already loaded).
    async function ensureClip(id: string | null) {
      if (!id || loadedIdRef.current === id) return
      let url = urlCache[id]
      if (!url) {
        const file = await getVideo(id)
        if (!file) return
        url = URL.createObjectURL(file)
        urlCache[id] = url
      }
      loadedIdRef.current = id
      setVideoSrc(url)
    }

    channel.addEventListener('message', ({ data }) => {
      const vid = videoRef.current
      if (!vid) return

      let play: boolean
      if (data.type === 'send_initial_state') {
        if (!syncedRef.current) return
        play = data.isPlaying
      } else if (data.type === 'play') {
        play = true
      } else if (data.type === 'pause') {
        play = false
      } else if (data.type === 'seek') {
        play = !vid.paused // a seek alone shouldn't change play/pause state
      } else {
        return
      }

      pendingRef.current = { currentTime: data.currentTime, play }
      const wasLoaded = loadedIdRef.current === data.videoId
      void ensureClip(data.videoId).then(() => {
        const v = videoRef.current
        // If the clip was already loaded, apply now; otherwise onLoadedMetadata will.
        if (v && wasLoaded && v.readyState >= 1) applyPending(v)
      })
    })

    return () => {
      Object.values(urlCache).forEach((u) => URL.revokeObjectURL(u))
      channel.close()
    }
  }, [])

  function applyPending(vid: HTMLVideoElement) {
    const p = pendingRef.current
    if (!p) return
    vid.currentTime = p.currentTime
    if (p.play) void vid.play()
    else vid.pause()
    pendingRef.current = null
  }

  function handleSync() {
    syncedRef.current = true
    setSynced(true)
    channelRef.current?.postMessage({ type: 'request_initial_state' })
  }

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>
      <div className="h-screen bg-black relative overflow-hidden">
        {/* test page */}
         {/* <GestureTest />  */}
         <RockPaperScissors />  
        <video
          ref={videoRef}
          src={videoSrc ?? undefined}
          className="w-full h-full object-contain"
          onLoadedMetadata={() => applyPending(videoRef.current!)}
        />
        {!synced && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer"
            onClick={handleSync}
          >
            <span className="text-[#666] text-sm">Click to sync</span>
          </div>
        )}
      </div>
    </>
  )
}
