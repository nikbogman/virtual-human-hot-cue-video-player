import Head from 'next/head'
import TicTacToe from '../components/TicTacToe'
import InteractiveOverlay from '../components/PokingYoda/PokedGame'
import RockPaperScissors from '../components/RockPaperScissors/RockPaperScissors'
import { useMonitorSync } from '../hooks/useMonitorSync'
import { useOverlayVideo } from '../hooks/useOverlayVideo'

export default function Monitor() {
  const {
    videoRef,
    mode, synced, showOverlay, setShowOverlay,
    videoSrc, isIdleVideoActive, gameSession, rpsSession,
    gameClips, rpsClips,
    modeRef, pokedIdRef, touchedScreenIdRef, getClipUrl, getCurrentClipId,
    applyPending, handleSync,
  } = useMonitorSync()

  const { triggerOverlayVideo } = useOverlayVideo(
    videoRef, modeRef, getClipUrl, getCurrentClipId, setShowOverlay,
  )

  function handlePokeClick() {
    triggerOverlayVideo(getClipUrl(pokedIdRef.current) ?? null)
  }

  function handleBackgroundClick() {
    triggerOverlayVideo(getClipUrl(touchedScreenIdRef.current) ?? null)
  }

  return (
    <>
      <Head>
        <title>Monitor — Hot Cue Player</title>
      </Head>

      <div className="monitor-font h-screen bg-black relative overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc ?? undefined}
          className="w-full h-full object-contain"
          onLoadedMetadata={() => applyPending(videoRef.current!)}
        />

        {mode === 'tic-tac-toe' && (
          <TicTacToe key={gameSession} clips={gameClips} />
        )}

        {mode === 'rock-paper-scissors' && (
          <div className="absolute inset-0 z-50">
            <RockPaperScissors key={rpsSession} clips={rpsClips} />
          </div>
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
