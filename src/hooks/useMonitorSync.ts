import { useCallback, useEffect, useRef, useState } from 'react'
import { useBroadcastChannel } from './useBroadcastChannel'
import { useMonitorVideo } from './useMonitorVideo'
import {
  ALL_BINDING_SLOTS,
  type GameClip,
  type GameClips,
  type RPSClips,
} from '../types'

export type MonitorMode = 'video' | 'tic-tac-toe' | 'rock-paper-scissors'

export function playVideoWhenReady(video: HTMLVideoElement) {
  const handler = () => {
    video.removeEventListener('canplay', handler)
    video.play().catch((err) => console.error('Play error:', err))
  }
  video.addEventListener('canplay', handler)
}

export function useMonitorSync() {
  const { videoRef, videoSrc, preloadClip, ensureClip, getClipUrl, getCurrentClipId } = useMonitorVideo()

  const [mode, setMode] = useState<MonitorMode>('video')
  const [synced, setSynced] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [isIdleVideoActive, setIsIdleVideoActive] = useState(false)
  const [gameSession, setGameSession] = useState(0)
  const [rpsSession, setRpsSession] = useState(0)
  const [gameClips, setGameClips] = useState<GameClips>({
    start: null, place: null, win: null, lose: null, draw: null, idle: null,
  })
  const [rpsClips, setRpsClips] = useState<RPSClips>({
    intro: null,
    rock_win: null, rock_lose: null, rock_draw: null,
    paper_win: null, paper_lose: null, paper_draw: null,
    scissors_win: null, scissors_lose: null, scissors_draw: null,
  })

  const modeRef = useRef<MonitorMode>('video')
  const syncedRef = useRef(false)
  const pendingRef = useRef<{ currentTime: number; play: boolean } | null>(null)
  const pokedIdRef = useRef<string | null>(null)
  const touchedScreenIdRef = useRef<string | null>(null)

  useEffect(() => { modeRef.current = mode }, [mode])

  const applyPending = useCallback((vid: HTMLVideoElement) => {
    const p = pendingRef.current
    if (!p) return
    vid.currentTime = p.currentTime
    if (p.play) void vid.play()
    else vid.pause()
    pendingRef.current = null
  }, [])

  const { post, onMessage } = useBroadcastChannel()

  onMessage('titles_map', (data) => {
    pokedIdRef.current = data.mapping.poked
    touchedScreenIdRef.current = data.mapping.touched_screen
    if (data.mapping.poked) void preloadClip(data.mapping.poked)
    if (data.mapping.touched_screen) void preloadClip(data.mapping.touched_screen)
  })

  onMessage('game_bindings', (data) => {
    const resolve = async (slot: string): Promise<GameClip> => {
      const b = (data.mapping as Record<string, { id?: string; startTime?: number }>)[slot]
      if (!b?.id) return null
      await preloadClip(b.id)
      const src = getClipUrl(b.id)
      return src ? { src, startTime: b.startTime ?? 0 } : null
    }
    Promise.all(
      ALL_BINDING_SLOTS.map(async (s) => [s.key, await resolve(s.key)] as const)
    ).then((entries) => {
      const r = Object.fromEntries(entries) as Record<string, GameClip>
      setGameClips({ start: r.start, place: r.place, win: r.win, lose: r.lose, draw: r.draw, idle: r.idle })
      setRpsClips({
        intro: r.intro,
        rock_win: r.rock_win, rock_lose: r.rock_lose, rock_draw: r.rock_draw,
        paper_win: r.paper_win, paper_lose: r.paper_lose, paper_draw: r.paper_draw,
        scissors_win: r.scissors_win, scissors_lose: r.scissors_lose, scissors_draw: r.scissors_draw,
      })
    }).catch(console.error)
  })

  onMessage('show_tic_tac_toe', () => {
    pendingRef.current = null
    localStorage.setItem('monitorMode', 'tic-tac-toe')
    modeRef.current = 'tic-tac-toe'
    setMode('tic-tac-toe')
    setIsIdleVideoActive(false)
    setShowOverlay(false)
    setGameSession((prev) => prev + 1)
    videoRef.current?.pause()
  })

  onMessage('show_rock_paper_scissors', () => {
    pendingRef.current = null
    localStorage.setItem('monitorMode', 'rock-paper-scissors')
    modeRef.current = 'rock-paper-scissors'
    setMode('rock-paper-scissors')
    setIsIdleVideoActive(false)
    setShowOverlay(false)
    setRpsSession((prev) => prev + 1)
    videoRef.current?.pause()
  })

  onMessage('show_welcome', (data) => {
    pendingRef.current = { currentTime: data.startTime, play: true }
    localStorage.setItem('monitorMode', 'video')
    modeRef.current = 'video'
    setMode('video')
    setShowOverlay(true)
    const wasLoaded = getCurrentClipId() === data.videoId
    void ensureClip(data.videoId).then(() => {
      const v = videoRef.current
      if (v && wasLoaded && v.readyState >= 1) applyPending(v)
    })
  })

  const applyPlayback = (
    play: boolean,
    data: { videoId: string | null; currentTime: number; isIdle: boolean },
  ) => {
    setIsIdleVideoActive(data.isIdle)
    pendingRef.current = { currentTime: data.currentTime, play }
    const wasLoaded = getCurrentClipId() === data.videoId
    void ensureClip(data.videoId).then(() => {
      const v = videoRef.current
      if (modeRef.current !== 'video') return
      if (v && wasLoaded && v.readyState >= 1) applyPending(v)
    })
  }

  onMessage('send_initial_state', (data) => {
    if (!syncedRef.current) return
    applyPlayback(data.isPlaying, data)
  })
  onMessage('play',  (data) => applyPlayback(true, data))
  onMessage('pause', (data) => applyPlayback(false, data))
  onMessage('seek',  (data) => applyPlayback(!(videoRef.current?.paused ?? true), data))

  const handleSync = useCallback(() => {
    syncedRef.current = true
    setSynced(true)

    const saved = localStorage.getItem('monitorMode')
    if (saved === 'tic-tac-toe' && modeRef.current !== 'tic-tac-toe') {
      modeRef.current = 'tic-tac-toe'
      setMode('tic-tac-toe')
      setIsIdleVideoActive(false)
      setShowOverlay(false)
      setGameSession((p) => p + 1)
    }
    if (saved === 'rock-paper-scissors' && modeRef.current !== 'rock-paper-scissors') {
      modeRef.current = 'rock-paper-scissors'
      setMode('rock-paper-scissors')
      setIsIdleVideoActive(false)
      setShowOverlay(false)
      setRpsSession((p) => p + 1)
    }

    post({ type: 'request_initial_state' })
  }, [])

  return {
    videoRef,
    mode, synced, showOverlay, setShowOverlay,
    videoSrc, isIdleVideoActive, gameSession, rpsSession,
    gameClips, rpsClips,
    modeRef, pokedIdRef, touchedScreenIdRef, getClipUrl, getCurrentClipId,
    applyPending, handleSync,
  }
}
