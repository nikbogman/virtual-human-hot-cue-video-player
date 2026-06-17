import React from "react";

interface InteractiveOverlayProps {
  onPokeClick: () => void;
  onBackgroundClick: () => void;
}

export default function InteractiveOverlay({ 
  onPokeClick, 
  onBackgroundClick 
}: InteractiveOverlayProps) {
  return (
    <div
      onPointerDown={onBackgroundClick}
      className="absolute inset-0 z-50 cursor-pointer"
    >
      <div
        onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
          e.stopPropagation();
          onPokeClick();
        }}
        className="absolute top-[45%] left-[35%] w-[45%] h-[50%] cursor-pointer"
        // Uncomment below for testing layout:
        // className="absolute top-[45%] left-[25%] w-[45%] h-[50%] cursor-pointer border-2 border-dashed border-white/50"
      />
    </div>
  );
}