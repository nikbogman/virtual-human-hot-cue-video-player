import type { MutableRefObject } from 'react'
import type { MonitorMode } from './controller/types'

export function useOverlayVideo(
  videoRefs: MutableRefObject<Map<string, HTMLVideoElement>>,
  activeIdRef: MutableRefObject<string | null>,
  modeRef: MutableRefObject<MonitorMode>,
  setActiveId: (id: string | null) => void,
  setShowOverlay: (show: boolean) => void,
) {
  function triggerOverlayVideo(targetId: string | null) {
    if (!targetId || modeRef.current !== 'video') return

    const previousId = activeIdRef.current
    const previousTime = videoRefs.current.get(previousId ?? '')?.currentTime ?? 0
    const wasPlaying = !(videoRefs.current.get(previousId ?? '')?.paused ?? true)

    setShowOverlay(false)
    setActiveId(targetId)

    const targetVid = videoRefs.current.get(targetId)
    if (!targetVid) return
    targetVid.currentTime = 0
    void targetVid.play()

    targetVid.addEventListener('ended', function restore() {
      targetVid.removeEventListener('ended', restore)
      setActiveId(previousId)
      if (previousId) {
        const prev = videoRefs.current.get(previousId)
        if (prev) {
          prev.currentTime = previousTime
          if (wasPlaying) void prev.play()
        }
      }
      setShowOverlay(true)
    })
  }

  return { triggerOverlayVideo }
}
