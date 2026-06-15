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

    async function start() {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true
        })

      const video = document.createElement("video")

      video.srcObject = stream

      await video.play()

      const vision =
        await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        )

      const handLandmarker =
        await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },
            runningMode: "VIDEO",
            numHands: 1
          }
        )

      function loop() {
        if (!running) return

        const result =
          handLandmarker.detectForVideo(
            video,
            performance.now()
          )

        const hand =
          result.landmarks?.[0]

        if (hand) {
          const gesture =
            detectGesture(hand)

          setMove(gesture)
        }

        requestAnimationFrame(loop)
      }

      loop()
    }

    start()

    return () => {
      running = false
    }
  }, [])

  return move
}