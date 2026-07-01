export type MonitorMode =
  | "video"
  | "idle"
  | "tic-tac-toe"
  | "rock-paper-scissors";
export type TttClip = "start" | "turn" | "win" | "lose" | "draw" | "idle";

export type ParentToChildMessage =
  | {
      type: "SYNC_VIDEO";
      event: "play" | "pause" | "seek";
      mode: MonitorMode;
      payload: { id: string; currentTime: number; sentAt: number };
    }
  | { type: "CHANGE_MODE"; mode: MonitorMode }
  | { type: "CUES_UPDATE" };

export type ChildToParentMessage =
  | { type: "STATUS_UPDATE"; payload: { status: string } }
  | { type: "YODA_POKED" }
  | { type: "BACKGROUND_POKED" }
  | { type: "TICTACTOE_PLAY"; clip: TttClip };
