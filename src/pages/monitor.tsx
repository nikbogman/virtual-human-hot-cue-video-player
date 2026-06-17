import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import TicTacToe from '../components/TicTacToe'
import InteractiveOverlay from '../components/PokingYoda/PokedGame'
import { getVideo } from '../lib/videoDB'

type MonitorMode = 'video' | 'tic-tac-toe'

export default function Monitor() {
  const [synced, setSynced] = useState(false)
  const [mode, setMode] = useState<MonitorMode>('video')
  const [gameBackgroundCue, setGameBackgroundCue] = useState<{ startTime: number; version: number } | null>(null)
  const [gameSession, setGameSession] = useState(0)
  const [isIdleVideoActive, setIsIdleVideoActive] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [knownVideos, setKnownVideos] = useState<Record<string, string>>({})
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)

  const channelRef = useRef<BroadcastChannel | null>(null)
  const syncedRef = useRef(false)
  const pendingRef = useRef<{ currentTime: number; play: boolean } | null>(null)
  const modeRef = useRef<MonitorMode>('video')
  const activeVideoIdRef = useRef<string | null>(null)
  const videoRefsMap = useRef<Record<string, HTMLVideoElement | null>>({})

  const urlCacheRef = useRef<Record<string, string>>({})
  const pokedIdRef = useRef<string | null>(null)
  const touchedScreenIdRef = useRef<string | null>(null)
  const stateBeforeOverlayRef = useRef<{ videoId: string | null; currentTime: number; play: boolean } | null>(null)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    activeVideoIdRef.current = activeVideoId
  }, [activeVideoId])

  function applyPending(vid: HTMLVideoElement) {
    const p = pendingRef.current
    if (!p) return
    vid.currentTime = p.currentTime
    if (p.play) void vid.play()
    else vid.pause()
    pendingRef.current = null
  }

  function triggerOverlayVideo(targetId: string | null) {
    if (!targetId || modeRef.current !== 'video') return
    if (!urlCacheRef.current[targetId]) return

    const prevId = activeVideoIdRef.current
    const prevVid = prevId ? videoRefsMap.current[prevId] : null

    stateBeforeOverlayRef.current = {
      videoId: prevId,
      currentTime: prevVid?.currentTime ?? 0,
      play: prevVid ? !prevVid.paused : false,
    }

    setShowOverlay(false)
    prevVid?.pause()

    activeVideoIdRef.current = targetId
    setActiveVideoId(targetId)

    const targetVid = videoRefsMap.current[targetId]
    if (targetVid) {
      targetVid.currentTime = 0
      void targetVid.play()
    }

    window.setTimeout(() => {
      const state = stateBeforeOverlayRef.current
      if (!state?.videoId) return

      const restoredId = state.videoId
      activeVideoIdRef.current = restoredId
      setActiveVideoId(restoredId)

      const restoredVid = videoRefsMap.current[restoredId]
      if (restoredVid) {
        restoredVid.currentTime = state.currentTime
        if (state.play) void restoredVid.play()
      }

      setShowOverlay(true)
    }, 3000)
  }

  function handlePokeClick() {
    triggerOverlayVideo(pokedIdRef.current)
  }

  function handleBackgroundClick() {
    triggerOverlayVideo(touchedScreenIdRef.current)
  }

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    channelRef.current = channel
    const urlCache = urlCacheRef.current

    async function preloadClip(id: string | null) {
      if (!id) return
      let url = urlCache[id]
      if (!url) {
        const file = await getVideo(id)
        if (!file) return
        url = URL.createObjectURL(file)
        urlCache[id] = url
      }
      setKnownVideos((prev) => (id in prev ? prev : { ...prev, [id]: url }))
    }

    async function ensureClip(id: string | null) {
      if (!id) return false
      let url = urlCache[id]
      if (!url) {
        const file = await getVideo(id)
        if (!file) return false
        url = URL.createObjectURL(file)
        urlCache[id] = url
      }
      setKnownVideos((prev) => (id in prev ? prev : { ...prev, [id]: url }))
      if (activeVideoIdRef.current !== id) {
        activeVideoIdRef.current = id
        setActiveVideoId(id)
      }
      return true
    }

    function setGameBackground(startTime: number) {
      setGameBackgroundCue((prev) => ({
        startTime,
        version: (prev?.version ?? 0) + 1,
      }))
    }

    channel.addEventListener('message', ({ data }) => {
      if (data.type === 'titles_map') {
        pokedIdRef.current = data.mapping.poked
        touchedScreenIdRef.current = data.mapping.touched_screen
        if (data.mapping.poked) void preloadClip(data.mapping.poked)
        if (data.mapping.touched_screen) void preloadClip(data.mapping.touched_screen)
        return
      }

      if (data.type === 'show_tic_tac_toe') {
        pendingRef.current = null
        localStorage.setItem('monitorMode', 'tic-tac-toe')
        modeRef.current = 'tic-tac-toe'
        setMode('tic-tac-toe')
        setIsIdleVideoActive(false)
        setShowOverlay(false)
        setGameSession((prev) => prev + 1)
        void ensureClip(data.videoId).then((loaded) => {
          if (loaded) setGameBackground(data.startTime)
        })
        const activeId = activeVideoIdRef.current
        if (activeId) videoRefsMap.current[activeId]?.pause()
        return
      }

      if (data.type === 'show_welcome') {
        pendingRef.current = { currentTime: data.startTime, play: true }
        localStorage.setItem('monitorMode', 'video')
        modeRef.current = 'video'
        setGameBackgroundCue(null)
        setMode('video')
        setShowOverlay(true)
        void ensureClip(data.videoId).then(() => {
          const v = videoRefsMap.current[data.videoId]
          if (v && v.readyState >= 1) applyPending(v)
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

      let play: boolean
      if (data.type === 'send_initial_state') {
        if (!syncedRef.current) return
        play = data.isPlaying
      } else if (data.type === 'play') {
        play = true
      } else if (data.type === 'pause') {
        play = false
      } else if (data.type === 'seek') {
        const activeId = activeVideoIdRef.current
        const vid = activeId ? videoRefsMap.current[activeId] : null
        if (!vid) return
        play = !vid.paused
      } else {
        return
      }

      setIsIdleVideoActive(data.isIdle === true)
      pendingRef.current = { currentTime: data.currentTime, play }
      void ensureClip(data.videoId).then(() => {
        if (modeRef.current === 'tic-tac-toe') return
        const v = videoRefsMap.current[data.videoId]
        if (v && v.readyState >= 1) applyPending(v)
      })
    })

    return () => {
      Object.values(urlCache).forEach((u) => URL.revokeObjectURL(u))
      channel.close()
    }
  }, [])

  function handleSync() {
    syncedRef.current = true
    setSynced(true)
    if (localStorage.getItem('monitorMode') === 'tic-tac-toe') {
      modeRef.current = 'tic-tac-toe'
      setMode('tic-tac-toe')
      setIsIdleVideoActive(false)
      setShowOverlay(false)
      setGameSession((prev) => prev + 1)
    }
    channelRef.current?.postMessage({ type: 'request_initial_state' })
  }

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>
      <div className="monitor-font h-screen bg-black relative overflow-hidden">
        {Object.entries(knownVideos).map(([id, url]) => (
          <video
            key={id}
            ref={(el) => { videoRefsMap.current[id] = el }}
            src={url}
            preload="auto"
            className={`absolute inset-0 w-full h-full object-contain ${
              mode === 'video' && activeVideoId === id
                ? 'opacity-100 z-10'
                : 'opacity-0 z-0 pointer-events-none'
            }`}
            onLoadedMetadata={() => {
              if (id === activeVideoIdRef.current) applyPending(videoRefsMap.current[id]!)
            }}
          />
        ))}
        {mode === 'tic-tac-toe' && (
          <TicTacToe
            key={gameSession}
            backgroundCue={gameBackgroundCue}
            backgroundSrc={activeVideoId ? knownVideos[activeVideoId] : undefined}
          />
        )}
        {!synced && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer z-[60]"
            onClick={handleSync}
          >
            <span className="text-[#666] text-sm">Click to sync</span>
          </div>
        )}
        {mode === 'video' && synced && isIdleVideoActive && showOverlay && (
          <InteractiveOverlay
            onPokeClick={handlePokeClick}
            onBackgroundClick={handleBackgroundClick}
          />
        )}
      </div>
    </>
  )
}
