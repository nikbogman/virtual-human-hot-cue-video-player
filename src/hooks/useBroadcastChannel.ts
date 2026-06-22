import { useEffect, useRef } from 'react'
import type { VideoSyncMessage } from '../types'

export function useBroadcastChannel() {
  const channelRef = useRef<BroadcastChannel | null>(null)
  // One handler slot per message type — calling onMessage replaces the previous one.
  const handlersRef = useRef(new Map<string, (data: any) => void>())

  // Both functions are created once and never change — safe to omit from dep arrays.
  const post = useRef((msg: VideoSyncMessage) => {
    channelRef.current?.postMessage(msg)
  }).current

  // Register a handler for a specific message type. Call directly in the hook/component
  // body — no useEffect wrapper needed. TypeScript narrows `data` to the matching variant.
  const onMessage = useRef(<T extends VideoSyncMessage['type']>(
    type: T,
    handler: (data: Extract<VideoSyncMessage, { type: T }>) => void,
  ): void => {
    handlersRef.current.set(type, handler as (data: any) => void)
  }).current

  useEffect(() => {
    const channel = new BroadcastChannel('video_sync')
    channelRef.current = channel

    const listener = ({ data }: MessageEvent<VideoSyncMessage>) => {
      handlersRef.current.get(data.type)?.(data)
    }
    channel.addEventListener('message', listener)

    return () => {
      channel.removeEventListener('message', listener)
      channel.close()
      channelRef.current = null
    }
  }, [])

  return { post, onMessage }
}
