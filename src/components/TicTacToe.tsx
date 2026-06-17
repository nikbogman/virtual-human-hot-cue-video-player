import { useCallback, useEffect, useRef, useState } from "react";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const THINK_DELAY = 4000;
const OPENING_THINK_DELAY = 13000;
const END_CHOICES_DELAY = 12000;
const COMPUTER_MARK_SRC = "/lightsaberGreen.png";
const HUMAN_MARK_SRC = "/lightsaberRed.png";
const CHOICE_BUTTON_CLASS =
  "h-[100px] w-[200px] cursor-pointer rounded-xl bg-white/[0.98] text-[2.5rem] font-bold text-[#616640] " +
  "shadow-[0_4px_20px_rgba(6,82,11,0.35)] hover:bg-[#9bb38cb6]";
const CELL_CLASS =
  "grid h-[100px] w-[100px] cursor-pointer place-items-center border-0 bg-[rgba(169,171,156,0.5)] p-0";

function emptyBoard() {
  return Array<string>(9).fill("");
}

function getWinner(board: string[]) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

interface Props {
  backgroundCue?: { startTime: number; version: number } | null;
  backgroundSrc?: string;
  onTriggerCue?: (title: string) => void;
}

type GameResult = {
  message: string;
  scenarioCue: "draw_scenario" | "win_scenario" | "lose_scenario";
};

function gameResult(board: string[]): GameResult | null {
  const winner = getWinner(board);
  if (winner === "O")
    return { message: "You win", scenarioCue: "win_scenario" };
  if (winner === "X")
    return { message: "Yoda wins", scenarioCue: "lose_scenario" };
  if (board.every((cell) => cell))
    return { message: "Draw!", scenarioCue: "draw_scenario" };
  return null;
}

function markVisual(mark: string) {
  if (mark === "X")
    return { src: COMPUTER_MARK_SRC, alt: "Computer lightsaber" };
  if (mark === "O") return { src: HUMAN_MARK_SRC, alt: "User lightsaber" };
  return null;
}

export default function TicTacToe({
  backgroundCue,
  backgroundSrc,
  onTriggerCue,
}: Props) {
  const [board, setBoard] = useState(emptyBoard);
  const [humanTurn, setHumanTurn] = useState(false);
  const [status, setStatus] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const gameOverRef = useRef(false);
  const boardRef = useRef(board);
  const backgroundRef = useRef<HTMLVideoElement>(null);
  const thinkTimerRef = useRef<number | undefined>(undefined);
  const choiceTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const finishGame = useCallback(
    (result: GameResult) => {
      gameOverRef.current = true;
      clearTimeout(choiceTimerRef.current);
      setStatus(result.message);
      setShowChoices(false);
      setHumanTurn(false);
      onTriggerCue?.(result.scenarioCue);
      choiceTimerRef.current = window.setTimeout(() => {
        setShowChoices(true);
      }, END_CHOICES_DELAY);
    },
    [onTriggerCue],
  );

  const runComputerTurn = useCallback(
    (delay = THINK_DELAY, isFirstTurn = false) => {
      // If it's the very first turn, trigger the start animation instead of yoda_turn
      if (isFirstTurn) {
        onTriggerCue?.("tic_tac_toe_start");
      } else {
        onTriggerCue?.("yoda_turn");
      }

      clearTimeout(thinkTimerRef.current);
      thinkTimerRef.current = window.setTimeout(() => {
        if (gameOverRef.current) return;

        const prev = boardRef.current;
        const empty = prev
          .map((cell, i) => (cell ? -1 : i))
          .filter((i) => i >= 0);
        if (empty.length === 0) return;

        const next = [...prev];
        next[empty[Math.floor(Math.random() * empty.length)]] = "X";
        boardRef.current = next;
        setBoard(next);

        const result = gameResult(next);
        if (result) finishGame(result);
        else {
          setHumanTurn(true);
          setStatus("");
        }
      }, delay);
    },
    [finishGame, onTriggerCue],
  );

  const startNewGame = useCallback(() => {

    gameOverRef.current = false;
    clearTimeout(choiceTimerRef.current);
    setShowChoices(false);
    setShowGrid(true);

    const fresh = emptyBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    setStatus("");
    setHumanTurn(false);

    if (backgroundRef.current && backgroundCue) {
      backgroundRef.current.currentTime = backgroundCue.startTime
      backgroundRef.current.play().catch(err => console.log(err))
    }

    onTriggerCue?.('TicTacToe')

    runComputerTurn(OPENING_THINK_DELAY, true);
  }, [runComputerTurn]);

  useEffect(() => {
    runComputerTurn(OPENING_THINK_DELAY, true);
    return () => {
      clearTimeout(thinkTimerRef.current);
      clearTimeout(choiceTimerRef.current);
    };
  }, [runComputerTurn]);

  useEffect(() => {
    const vid = backgroundRef.current;
    if (!vid || !backgroundCue) return;
    vid.currentTime = backgroundCue.startTime;
    void vid.play();
  }, [backgroundCue]);

  function onCellClick(index: number) {
    if (gameOverRef.current || !humanTurn || board[index]) return;

    const next = [...board];
    next[index] = "O";
    boardRef.current = next;
    setBoard(next);

    const result = gameResult(next);
    if (result) {
      finishGame(result);
      return;
    }
    setHumanTurn(false);
    runComputerTurn();
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video
        ref={backgroundRef}
        className="fixed inset-0 z-0 h-full w-full"
        src={backgroundSrc}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={() => {
          if (!backgroundCue || !backgroundRef.current) return;
          backgroundRef.current.currentTime = backgroundCue.startTime;
          void backgroundRef.current.play();
        }}
      />

      <p className="fixed left-1/2 top-[10%] z-[3] min-h-16 -translate-x-1/2 text-6xl text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
        {status}
      </p>

      <div
        className={`${showChoices ? "flex" : "hidden"} fixed inset-x-0 bottom-0 top-[-40%] z-10 items-center justify-center gap-8`}
      >
        <button
          type="button"
          className={CHOICE_BUTTON_CLASS}
          onClick={startNewGame}
        >
          Yes
        </button>
        <button
          type="button"
          className={CHOICE_BUTTON_CLASS}
          onClick={() => {
            setShowChoices(false);
            setShowGrid(false);
            setStatus("");
            onTriggerCue?.('idle')
          }}
        >
          No
        </button>
      </div>

      {showGrid && (
        <div className="fixed left-1/2 top-[80%] z-[1] grid -translate-x-1/2 -translate-y-1/2 grid-cols-[repeat(3,100px)] grid-rows-[repeat(3,100px)] gap-1">
          {board.map((mark, i) => (
            <button
              key={i}
              type="button"
              className={`${CELL_CLASS}${mark ? " cursor-default" : ""}`}
              onClick={() => onCellClick(i)}
            >
              {mark ? (
                <img
                  className="h-[84px] w-[84px] select-none object-contain pointer-events-none"
                  src={markVisual(mark)?.src}
                  alt={markVisual(mark)?.alt ?? ""}
                  draggable={false}
                />
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
