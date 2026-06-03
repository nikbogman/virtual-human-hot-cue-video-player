# Changelog

## 2026-06-03 (2)

Click now toggles the tick off on a second click.

## 2026-06-03

Added `public/simple.html` — a minimal page with a full-screen background video and a centred clickable box that shows a tick on click. Documented in `SPEC.md` under **Simple prototype**, developed on a new branch `feat/video-overlay`.

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
