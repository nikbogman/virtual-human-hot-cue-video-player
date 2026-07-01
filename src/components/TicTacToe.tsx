import { useCallback, useEffect, useRef, useState } from "react";
import type { TttClip } from "../hooks/controller/types";

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

const THINK_DELAY = 7000;
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
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return null;
}

function endMessage(board: string[]) {
  const winner = getWinner(board);
  if (winner === "O") return "You win!";
  if (winner === "X") return "Yoda wins!";
  if (board.every((cell) => cell)) return "Draw!";
  return null;
}

function outcomeKey(board: string[]): "win" | "lose" | "draw" | null {
  const winner = getWinner(board);
  if (winner === "O") return "win";
  if (winner === "X") return "lose";
  if (board.every((cell) => cell)) return "draw";
  return null;
}

function markVisual(mark: string) {
  if (mark === "X")
    return { src: COMPUTER_MARK_SRC, alt: "Computer lightsaber" };
  if (mark === "O") return { src: HUMAN_MARK_SRC, alt: "User lightsaber" };
  return null;
}

type Phase = "start" | "placing" | "idle" | "over";

interface Props {
  onPlayClip: (clip: TttClip) => void;
  clipEndedSignal: number;
}

export default function TicTacToe({ onPlayClip, clipEndedSignal }: Props) {
  const [board, setBoard] = useState(emptyBoard);
  const [humanTurn, setHumanTurn] = useState(false);
  const [status, setStatus] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const boardRef = useRef(board);
  const phaseRef = useRef<Phase>("start");
  const thinkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const choiceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onPlayClipRef = useRef(onPlayClip);
  onPlayClipRef.current = onPlayClip;

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const finishGame = useCallback((message: string) => {
    phaseRef.current = "over";
    setStatus(message);
    setHumanTurn(false);
    const key = outcomeKey(boardRef.current);
    if (key) onPlayClipRef.current(key);
    clearTimeout(choiceTimerRef.current);
    choiceTimerRef.current = setTimeout(
      () => setShowChoices(true),
      END_CHOICES_DELAY,
    );
  }, []);

  const goIdle = useCallback(() => {
    phaseRef.current = "idle";
    setStatus("");
    setHumanTurn(true);
    onPlayClipRef.current("idle");
  }, []);

  const placeComputerMark = useCallback(() => {
    if (phaseRef.current !== "placing") return;
    const prev = boardRef.current;
    const empty = prev.map((cell, i) => (cell ? -1 : i)).filter((i) => i >= 0);
    if (empty.length === 0) return;
    const next = [...prev];
    next[empty[Math.floor(Math.random() * empty.length)]] = "X";
    boardRef.current = next;
    setBoard(next);
    const msg = endMessage(next);
    if (msg) finishGame(msg);
    else goIdle();
  }, [finishGame, goIdle]);

  const goPlacing = useCallback(() => {
    if (phaseRef.current !== "start" && phaseRef.current !== "idle") return;
    clearTimeout(thinkTimerRef.current);
    phaseRef.current = "placing";
    setHumanTurn(false);
    onPlayClipRef.current("turn");
    thinkTimerRef.current = setTimeout(placeComputerMark, THINK_DELAY);
  }, [placeComputerMark]);

  const startOpening = useCallback(() => {
    clearTimeout(thinkTimerRef.current);
    phaseRef.current = "start";
    onPlayClipRef.current("start");
    thinkTimerRef.current = setTimeout(goPlacing, THINK_DELAY);
  }, [goPlacing]);

  useEffect(() => {
    if (clipEndedSignal === 0) return;
    if (phaseRef.current === "start") {
      clearTimeout(thinkTimerRef.current);
      goPlacing();
    } else if (phaseRef.current === "placing") {
      clearTimeout(thinkTimerRef.current);
      placeComputerMark();
    } else if (phaseRef.current === "idle") {
      onPlayClipRef.current("idle");
    }
  }, [clipEndedSignal, goPlacing, placeComputerMark]);

  const startNewGame = useCallback(() => {
    clearTimeout(choiceTimerRef.current);
    setShowChoices(false);
    setShowGrid(true);
    const fresh = emptyBoard();
    boardRef.current = fresh;
    setBoard(fresh);
    setStatus("");
    startOpening();
  }, [startOpening]);

  useEffect(() => {
    startOpening();
    return () => {
      clearTimeout(thinkTimerRef.current);
      clearTimeout(choiceTimerRef.current);
    };
  }, [startOpening]);

  function onCellClick(index: number) {
    if (!humanTurn || board[index]) return;
    const next = [...board];
    next[index] = "O";
    boardRef.current = next;
    setBoard(next);
    const msg = endMessage(next);
    if (msg) finishGame(msg);
    else goPlacing();
  }

  return (
    <div className="absolute inset-0 z-10">
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
