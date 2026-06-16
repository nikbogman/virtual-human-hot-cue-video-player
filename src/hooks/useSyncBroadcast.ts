import { useEffect, useRef } from 'react'

export function useSyncBroadcast(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  getVideoId: () => string | null,
  getIsIdle: () => boolean = () => false,
) {
  const getVideoIdRef = useRef(getVideoId)
  const getIsIdleRef = useRef(getIsIdle)
  useEffect(() => {
    getVideoIdRef.current = getVideoId
  })
  useEffect(() => {
    getIsIdleRef.current = getIsIdle
  })

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    const vid = videoRef.current
    if (!vid) return

    const post = (type: 'play' | 'pause' | 'seek') =>
      channel.postMessage({ type, videoId: getVideoIdRef.current(), currentTime: vid.currentTime, isIdle: getIsIdleRef.current() })

    const onPlay = () => post('play')
    const onPause = () => post('pause')
    const onSeeked = () => post('seek')

    vid.addEventListener('play', onPlay)
    vid.addEventListener('pause', onPause)
    vid.addEventListener('seeked', onSeeked)

    channel.onmessage = ({ data }) => {
      if (data.type === 'request_initial_state') {
        vid.muted = true
        channel.postMessage({
          type: 'send_initial_state',
          videoId: getVideoIdRef.current(),
          currentTime: vid.currentTime,
          isPlaying: !vid.paused,
          isIdle: getIsIdleRef.current(),
        })
      }
    }

    return () => {
      vid.removeEventListener('play', onPlay)
      vid.removeEventListener('pause', onPause)
      vid.removeEventListener('seeked', onSeeked)
      channel.close()
    }
  }, [videoRef])

  function openMonitor() {
    window.open('/monitor', '_blank', 'width=960,height=600')
  }

  function showTicTacToe(startTime: number, videoId: string | null = getVideoIdRef.current()) {
    localStorage.setItem('monitorMode', 'tic-tac-toe')
    const channel = new BroadcastChannel('video_sync')
    channel.postMessage({ type: 'show_tic_tac_toe', videoId, startTime })
    channel.close()
  }

  function showWelcome(startTime: number, videoId: string | null = getVideoIdRef.current()) {
    localStorage.setItem('monitorMode', 'video')
    const channel = new BroadcastChannel('video_sync')
    channel.postMessage({ type: 'show_welcome', videoId, startTime })
    channel.close()
  }

  function setTicTacToeBackground(startTime: number, videoId: string | null = getVideoIdRef.current()) {
    const channel = new BroadcastChannel('video_sync')
    channel.postMessage({ type: 'set_tic_tac_toe_background', videoId, startTime })
    channel.close()
  }

  return { openMonitor, showTicTacToe, showWelcome, setTicTacToeBackground }
}
