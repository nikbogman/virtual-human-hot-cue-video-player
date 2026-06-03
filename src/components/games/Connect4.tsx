import React from 'react'

export default function Connect4({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0b0b0b] text-[#eee]">
      <div className="max-w-md w-full p-6 bg-[#111] rounded shadow text-center">
        <h2 className="text-2xl mb-4">Connect 4 (placeholder)</h2>
        <p className="text-sm text-[#aaa] mb-6">Simple placeholder for Connect 4.</p>
        <div className="flex justify-center gap-2">
          <button className="px-4 py-2 bg-[#222] rounded" onClick={onBack}>Back</button>
        </div>
      </div>
    </div>
  )
}
