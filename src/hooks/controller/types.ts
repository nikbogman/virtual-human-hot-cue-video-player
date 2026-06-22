export type MonitorMode = 'video' | 'idle' | 'tic-tac-toe' | 'rock-paper-scissors';

export type ParentToChildMessage =
  | { type: 'SYNC_VIDEO'; event: 'play' | 'pause' | 'seek'; mode: MonitorMode; payload: { id: string; currentTime: number; sentAt: number } }
  | { type: 'CHANGE_MODE'; mode: MonitorMode }
  | { type: 'CUES_UPDATE' }
  | { type: 'SHOW_TIC_TAC_TOE'; payload: { videoId: string | null; startTime: number } }
  | { type: 'SHOW_ROCK_PAPER_SCISSORS'; payload: { videoId: string | null; startTime: number } }
  | { type: 'SHOW_WELCOME'; payload: { videoId: string | null; startTime: number } }
export type ChildToParentMessage =
  | { type: 'STATUS_UPDATE'; payload: { status: string } }
  | { type: 'YODA_POKED' }
  | { type: 'BACKGROUND_POKED' };
