import React from "react";

const InteractiveOverlay = ({ onPokeClick, onBackgroundClick }) => {
  return (
    <div
      onPointerDown={onBackgroundClick}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        cursor: "pointer",
      }}
    >
      {/* POKE HOTSPOT - center of screen */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onPokeClick();
        }}
        style={{
          position: "absolute",
          top: "25%",
          left: "35%",
          width: "30%",
          height: "50%",
          cursor: "pointer",
          // border: '2px dashed rgba(255,255,255,0.5)', // Toggle for testing layout
        }}
      />
    </div>
  );
};

export default InteractiveOverlay;
