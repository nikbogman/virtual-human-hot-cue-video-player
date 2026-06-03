# Changelog

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

## 2026-06-02 (3)

Cue cards gained a separate **title** field alongside the existing **label**, and grew larger by
default. `HotCue` now has both `title` (short name, e.g. "Introduction") and `label` (longer text —
the first lines of what's said, shown as a multi-line preview so the controller can confirm the
segment). On upload `title` defaults to the file name and `label` is empty; the editor edits both
(label is now a multi-line textarea). Import coerces a missing `title` to "" for backward compat with
older exports.

## 2026-06-02 (2)

Added a **List ↔ Graph view toggle** for the cues, plus next-cue highlighting.

- New **graph view** (React Flow / `@xyflow/react`): each cue is a draggable node on a dotted canvas; drag from a node's bottom handle to another's top handle to draw a directed **"next cue"** connection (select an edge + Backspace to remove). Cards are deleted via their X button, not Backspace.
- Connections are a navigation aid: when a cue plays, the cues it links to get an **"up next"** dashed-amber highlight so the controller can find the next key fast. Playback stays manual (no auto-advance) — branches are the controller's choice.
- The **currently-playing** cue now gets a persistent white ring in **both** views (replaces the old 300ms flash). `useHotCues` no longer tracks `activeIndex`; `index.tsx` owns `playingId`, set on every trigger (keyboard or click).
- New `src/hooks/useCueGraph.ts` (node positions + links, persisted to `localStorage` keys `cuePositions` / `cueLinks`), `src/components/CueGraph.tsx` (canvas + custom node, dynamically imported with `ssr: false`), `src/components/CueCardFace.tsx` + `src/lib/cueStyle.ts` (card face/highlight shared by both views). Editing (key / start / label) works in both views via the same `CueCardEdit`.
- Dependency added: `@xyflow/react`.

## 2026-06-02

Reworked the app from one long video + timestamp cues into a **library of short clips, one per hot cue**. Each uploaded video becomes its own cue card; pressing its key plays that clip from an optional in-clip offset (`startTime`) and the clip stops at its own end — no bleed into following footage.

- `HotCue` is now `{ id, key, startTime, label, fileName }`. `id` (a `crypto.randomUUID()`) is also the IndexedDB key for that clip's file.
- `videoDB.ts` moved from a single fixed-key blob (`storeVideo`/`getStoredVideo`/`clearStoredVideo`) to an id-keyed multi-video store: `storeVideo(id, file)`, `getVideo(id)`, `deleteVideo(id)`, `clearAllVideos()`.
- `useHotCues` gains `addClips(files)` (replaces `addCue`); deleting/clearing cues also removes their clips from IndexedDB. Blank cues are no longer auto-discarded on close — every cue is backed by an uploaded file.
- `index.tsx` accepts multiple files (drop or browse), keeps one blob URL per clip, and binds the player to the active clip. The standalone "Remove video" button is gone (clips are removed per-card).
- Sync messages now carry `videoId`; `monitor.tsx` switches to the matching clip before mirroring play/pause/seek.

Note: this changes the `hotCues` localStorage shape and the IndexedDB key scheme — cues and videos saved by the previous version won't carry over.

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
