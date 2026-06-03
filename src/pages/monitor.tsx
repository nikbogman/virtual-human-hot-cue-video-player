import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import TicTacToe from '../components/TicTacToe'
import { getStoredVideo } from '../lib/videoDB'

type MonitorMode = 'video' | 'tic-tac-toe'

export default function Monitor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const [mode, setMode] = useState<MonitorMode>('video')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const syncedRef = useRef(false)
  const pendingRef = useRef<{ currentTime: number; isPlaying: boolean } | null>(null)

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    channelRef.current = channel

    channel.addEventListener('message', ({ data }) => {
      const vid = videoRef.current

      if (data.type === 'show_tic_tac_toe') {
        localStorage.setItem('monitorMode', 'tic-tac-toe')
        setMode('tic-tac-toe')
        vid?.pause()
        return
      }

      if (!vid) return

      if (data.type === 'send_initial_state') {
        if (!syncedRef.current) return
        pendingRef.current = { currentTime: data.currentTime, isPlaying: data.isPlaying }
        if (vid.readyState >= 1) applyPending(vid)
      } else if (data.type === 'play') {
        vid.currentTime = data.currentTime
        void vid.play()
      } else if (data.type === 'pause') {
        vid.currentTime = data.currentTime
        vid.pause()
      } else if (data.type === 'seek') {
        vid.currentTime = data.currentTime
      }
    })

    return () => channel.close()
  }, [])

  function applyPending(vid: HTMLVideoElement) {
    const p = pendingRef.current
    if (!p) return
    vid.currentTime = p.currentTime
    if (p.isPlaying) void vid.play()
    pendingRef.current = null
  }

  async function handleSync() {
    syncedRef.current = true
    setSynced(true)
    if (localStorage.getItem('monitorMode') === 'tic-tac-toe') {
      setMode('tic-tac-toe')
      return
    }
    const file = await getStoredVideo()
    if (file) setVideoSrc(URL.createObjectURL(file))
    channelRef.current?.postMessage({ type: 'request_initial_state' })
  }

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>
      <div className="h-screen bg-black relative overflow-hidden">
        {mode === 'tic-tac-toe' ? (
          <TicTacToe />
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
