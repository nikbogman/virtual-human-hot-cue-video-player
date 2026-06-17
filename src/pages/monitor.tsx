import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import TicTacToe from '../components/TicTacToe'
import InteractiveOverlay from '../components/PokingYoda/PokedGame'
import { getVideo } from '../lib/videoDB'
// to test it only says detected:rock or paper or scissors
// import GestureTest from '../components/RockPaperScissors/GestureTest' 

import RockPaperScissors from '../components/RockPaperScissors/RockPaperScissors'

type MonitorMode = 'video' | 'tic-tac-toe'

export default function Monitor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const [mode, setMode] = useState<MonitorMode>('video')
  const [gameBackgroundCue, setGameBackgroundCue] = useState<{ startTime: number; version: number } | null>(null)
  const [gameSession, setGameSession] = useState(0)
  const [isIdleVideoActive, setIsIdleVideoActive] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)

  const channelRef = useRef<BroadcastChannel | null>(null)
  const syncedRef = useRef(false)
  const pendingRef = useRef<{ currentTime: number; play: boolean } | null>(null)
  const modeRef = useRef<MonitorMode>('video')

  const loadedIdRef = useRef<string | null>(null)
  const urlCacheRef = useRef<Record<string, string>>({})
  const pokedIdRef = useRef<string | null>(null)
  const touchedScreenIdRef = useRef<string | null>(null)
  const stateBeforeOverlayRef = useRef<{ videoId: string | null; currentTime: number; play: boolean } | null>(null)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  function applyPending(vid: HTMLVideoElement) {
    const p = pendingRef.current
    if (!p) return
    vid.currentTime = p.currentTime
    if (p.play) void vid.play()
    else vid.pause()
    pendingRef.current = null
  }

  function playVideoWhenReady(video: HTMLVideoElement) {
    const playHandler = () => {
      video.removeEventListener('canplay', playHandler)
      video.play().catch((err) => console.error('Play error:', err))
    }
    video.addEventListener('canplay', playHandler)
  }

  function triggerOverlayVideo(targetUrl: string | null) {
    const vid = videoRef.current
    if (!vid || !targetUrl || modeRef.current !== 'video') return

    stateBeforeOverlayRef.current = {
      videoId: loadedIdRef.current,
      currentTime: vid.currentTime,
      play: !vid.paused,
    }

    setShowOverlay(false)
    vid.pause()
    vid.src = targetUrl
    vid.currentTime = 0
    vid.load()
    playVideoWhenReady(vid)

    window.setTimeout(() => {
      const state = stateBeforeOverlayRef.current
      if (!state) return

      const idleUrl = state.videoId ? urlCacheRef.current[state.videoId] : null
      if (idleUrl) {
        vid.pause()
        vid.src = idleUrl
        vid.currentTime = state.currentTime
        vid.load()
        if (state.play) playVideoWhenReady(vid)
      }

      setShowOverlay(true)
    }, 3000)
  }

  function handlePokeClick() {
    const targetUrl = pokedIdRef.current ? urlCacheRef.current[pokedIdRef.current] : null
    triggerOverlayVideo(targetUrl)
  }

  function handleBackgroundClick() {
    const targetUrl = touchedScreenIdRef.current ? urlCacheRef.current[touchedScreenIdRef.current] : null
    triggerOverlayVideo(targetUrl)
  }

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    channelRef.current = channel
    const urlCache = urlCacheRef.current

    async function preloadClip(id: string | null) {
      if (!id || urlCache[id]) return
      const file = await getVideo(id)
      if (!file) return
      urlCache[id] = URL.createObjectURL(file)
    }

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
      if (data.type === 'titles_map') {
        pokedIdRef.current = data.mapping.poked
        touchedScreenIdRef.current = data.mapping.touched_screen
        if (data.mapping.poked) void preloadClip(data.mapping.poked)
        if (data.mapping.touched_screen) void preloadClip(data.mapping.touched_screen)
        return
      }

      const vid = videoRef.current

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
        vid?.pause()
        return
      }

      if (data.type === 'show_welcome') {
        pendingRef.current = { currentTime: data.startTime, play: true }
        localStorage.setItem('monitorMode', 'video')
        modeRef.current = 'video'
        setGameBackgroundCue(null)
        setMode('video')
        setShowOverlay(true)
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
        play = !vid.paused
      } else {
        return
      }

      setIsIdleVideoActive(data.isIdle === true)
      pendingRef.current = { currentTime: data.currentTime, play }
      const wasLoaded = loadedIdRef.current === data.videoId
      void ensureClip(data.videoId).then(() => {
        const v = videoRef.current
        if (modeRef.current === 'tic-tac-toe') return
        if (v && wasLoaded && v.readyState >= 1) applyPending(v)
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
