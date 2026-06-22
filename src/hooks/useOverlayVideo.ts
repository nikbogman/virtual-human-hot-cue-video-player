import type { MutableRefObject, RefObject } from 'react'
import type { MonitorMode } from './useMonitorSync'
import { playVideoWhenReady } from './useMonitorSync'

export function useOverlayVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  modeRef: MutableRefObject<MonitorMode>,
  getClipUrl: (id: string | null) => string | undefined,
  getCurrentClipId: () => string | null,
  setShowOverlay: (show: boolean) => void,
) {
  function triggerOverlayVideo(targetUrl: string | null) {
    const vid = videoRef.current
    if (!vid || !targetUrl || modeRef.current !== 'video') return

    // Capture as a local snapshot — avoids stale reads if triggered again before restore fires.
    const snapshot = {
      videoId: getCurrentClipId(),
      currentTime: vid.currentTime,
      play: !vid.paused,
    }

    setShowOverlay(false)
    vid.pause()
    vid.src = targetUrl
    vid.currentTime = 0
    vid.load()
    playVideoWhenReady(vid)

    vid.addEventListener('ended', function restore() {
      vid.removeEventListener('ended', restore)
      const idleUrl = getClipUrl(snapshot.videoId)
      if (idleUrl) {
        vid.pause()
        vid.src = idleUrl
        vid.currentTime = snapshot.currentTime
        vid.load()
        if (snapshot.play) playVideoWhenReady(vid)
      }
      setShowOverlay(true)
    })
  }

  return { triggerOverlayVideo }
}
