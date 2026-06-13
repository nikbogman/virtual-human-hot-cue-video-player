import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import TicTacToe from '../components/TicTacToe'
import { getVideo } from '../lib/videoDB'

type MonitorMode = 'video' | 'tic-tac-toe'

export default function Monitor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const [mode, setMode] = useState<MonitorMode>('video')
  const [gameBackgroundCue, setGameBackgroundCue] = useState<{ startTime: number; version: number } | null>(null)
  const [gameSession, setGameSession] = useState(0)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const syncedRef = useRef(false)
  const pendingRef = useRef<{ currentTime: number; play: boolean } | null>(null)
  const modeRef = useRef<MonitorMode>('video')

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // Which clip is currently loaded, and a cache of blob URLs by clip id.
  const loadedIdRef = useRef<string | null>(null)
  const urlCacheRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    channelRef.current = channel
    const urlCache = urlCacheRef.current

    // Load the requested clip into the player (no-op if already loaded).
    async function ensureClip(id: string | null) {
      if (!id || loadedIdRef.current === id) return true
      let url = urlCache[id]
      if (!url) {
        const file = await getVideo(id)
        if (!file) return false
        url = URL.createObjectURL(file)
        urlCache[id] = url
      }
      loadedIdRef.current = id
      setVideoSrc(url)
      return true
    }

    function setGameBackground(startTime: number) {
      setGameBackgroundCue((prev) => ({
        startTime,
        version: (prev?.version ?? 0) + 1,
      }))
    }

    channel.addEventListener('message', ({ data }) => {
      const vid = videoRef.current

      if (data.type === 'show_tic_tac_toe') {
        pendingRef.current = null
        localStorage.setItem('monitorMode', 'tic-tac-toe')
        modeRef.current = 'tic-tac-toe'
        setMode('tic-tac-toe')
        setGameSession((prev) => prev + 1)
        void ensureClip(data.videoId).then((loaded) => {
          if (loaded) setGameBackground(data.startTime)
        })
        vid?.pause()
        return
      }

      if (data.type === 'show_welcome') {
        pendingRef.current = { currentTime: data.startTime, play: true }
        localStorage.setItem('monitorMode', 'video')
        modeRef.current = 'video'
        setGameBackgroundCue(null)
        setMode('video')
        const wasLoaded = loadedIdRef.current === data.videoId
        void ensureClip(data.videoId).then(() => {
          const v = videoRef.current
          if (v && wasLoaded && v.readyState >= 1) applyPending(v)
        })
        return
      }

      if (data.type === 'set_tic_tac_toe_background') {
        if (modeRef.current !== 'tic-tac-toe') return
        void ensureClip(data.videoId).then((loaded) => {
          if (loaded) setGameBackground(data.startTime)
        })
        return
      }

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
        if (modeRef.current === 'tic-tac-toe') return
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
    if (localStorage.getItem('monitorMode') === 'tic-tac-toe') {
      modeRef.current = 'tic-tac-toe'
      setMode('tic-tac-toe')
      setGameSession((prev) => prev + 1)
    } else {
      channelRef.current?.postMessage({ type: 'request_initial_state' })
    }
  }

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>
      <div className="monitor-font h-screen bg-black relative overflow-hidden">
        {mode === 'tic-tac-toe' ? (
          <TicTacToe
            key={gameSession}
            backgroundCue={gameBackgroundCue}
            backgroundSrc={videoSrc ?? undefined}
          />
        ) : (
          <video
            ref={videoRef}
            src={videoSrc ?? undefined}
            className="w-full h-full object-contain"
            onLoadedMetadata={() => applyPending(videoRef.current!)}
          />
        )}
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
