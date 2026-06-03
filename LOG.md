# Changelog

## 2026-06-03 (Tic Tac Toe) (9)

The controller can escape the game mode with a hot cue, named `start/ welcome/ home/ reset`. 

## 2026-06-03 (Tic Tac Toe) (8)

Bug fix: There was a hydration error. The issue was the saved hot cues: the server rendered with no localStorage, but the client’s first render immediately loaded saved cues, so the HTML didn’t match. Now, the first server/client render matches, then it loads saved cues right after hydration.

## 2026-06-03 (Tic Tac Toe) (7)

Tic tac toe game is triggered by a hot cue named `tic tac toe/ tic-tac-toe`. The game restarts every time the key with the game assigned id pressed. Other videos can play in the background. 

## 2026-06-03 (Tic Tac Toe) (6)

Tic tac toe moved into the Next.js app: `src/components/TicTacToe.tsx` + `src/styles/tic-tac-toe.css`. `/monitor` shows the game (background video, grid, computer X, Yes/No). Static prototype is still in `public/tic-tac-toe/`. Currently the commander uses a key named `tic-tac-toe/ tic tac toe ..` to trigger the game. No other videos can be triggered by hot cues while the game is running. 

## 2026-06-03 (Tic Tac Toe) (5)

After the end of the game, buttons with Yes / No appear. Yes starts a new game, no hides the grid. No explanation text added, since the VH will ask about directions and give instructions. 

## 2026-06-03 (Tic Tac Toe) (4)

X is the computer: places on a random empty square after each human (O) move. Starts the game with the first X. 800ms “thinking” delay before every computer move, including the opening one. 

## 2026-06-03 (Tic Tac Toe) (3)

Win detection: first player to get 3 in a row, column, or diagonal wins. Game stops and shows “X wins!” or “O wins!”.

## 2026-06-03 (Tic Tac Toe) (2)

Turns alternate between X and O on each click (X goes first).

## 2026-06-03 (Tic Tac Toe)

Added `public/tic-tac-toe/` with separate `index.html`, `style.css`, and `main.js` in a new branch `feat/tic-tac-toe-game`. Full-screen background video (`../background.mp4`), centred 3×3 grid, click an empty square to place an X. No turns, win detection, or O yet.

## 2026-05-25 (2)

Extracted all hot-cue state and logic into a `useHotCues` hook (`src/hooks/useHotCues.ts`). Renamed `Segment` to `HotCue` throughout. The `index.tsx` page now only handles video loading and layout.

Note: localStorage key changed from `"segments"` to `"hotCues"` — existing saved cues won't carry over.

## 2026-05-25 (2)

`useHotCues` no longer accepts a `videoRef`. It now takes an `onCuePress(cue)` callback instead. The hook stays decoupled from the video element; the caller decides what to do when a cue is triggered.

## 2026-05-25 (3)

Video player div set to 50% screen width and height (`w-1/2 h-1/2`).

## 2026-05-25 (4)

Hot cue cards now enter edit mode on right-click instead of left-click. Browser context menu is suppressed.

## 2026-05-25 (5)

Left-click on a hot cue card now triggers the cue (seek + play). `handleCuePress` defined as a named function in `index.tsx`, passed to `useHotCues` as `onCuePress`, and called directly from the card's `onClick` — same callback used by both keyboard and click.

## 2026-05-25 (6)

Migrated BroadcastChannel sync from `features/index.html` and `features/popup.html` into the Next.js app. Added `src/hooks/useSyncBroadcast.ts` (attaches play/pause/seeked listeners, responds to `request_initial_state`). Added `src/pages/monitor.tsx` — the sync screen with no controls and a "Click to sync" overlay. An "Open monitor" button in the main toolbar opens it in a new window.

## 2026-05-25 (7)

Added IndexedDB storage for the video file (`src/lib/videoDB.ts` — `storeVideo` / `getStoredVideo`). The main player saves the file to IndexedDB on load and restores it on mount. The monitor reads from IndexedDB on sync instead of receiving a blob URL over BroadcastChannel. IndexedDB is used because it has no meaningful size limit, unlike localStorage or sessionStorage.
