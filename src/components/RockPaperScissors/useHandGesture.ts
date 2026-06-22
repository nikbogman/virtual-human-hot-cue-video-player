import { useEffect, useState } from "react"
import {
  HandLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision"

import { detectGesture } from "./gesture"

export function useHandGesture() {
  const [move, setMove] = useState<string | null>(null)

  useEffect(() => {
    let running = true
    let stream: MediaStream | null = null
    let handLandmarker: HandLandmarker | null = null

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (!running) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const video = document.createElement("video")
      video.srcObject = stream
      await video.play()
      if (!running) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      )
      if (!running) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 1,
      })
      if (!running) {
        stream.getTracks().forEach((t) => t.stop())
        handLandmarker.close()
        return
      }

      function loop() {
        if (!running) return
        const result = handLandmarker!.detectForVideo(video, performance.now())
        const hand = result.landmarks?.[0]
        if (hand) setMove(detectGesture(hand))
        requestAnimationFrame(loop)
      }

      loop()
    }

    start()

    return () => {
      running = false
      stream?.getTracks().forEach((t) => t.stop())
      handLandmarker?.close()
    }
  }, [])

  return move
}
