# Virtual Human Video Segment Player — v2

## Introduction

This tool supports Wizard of Oz testing of a virtual human interaction scenario. A tester manually triggers pre-recorded video segments in real time using **hot cues** — keyboard shortcuts that jump the video to a pre-assigned timestamp — simulating a reactive virtual human for the visitor.

This is a rebuild of the [original version](https://holobox-video-controller-957610498090.us-west1.run.app/).

---

## User Stories

1. As a tester, I want to trigger hot cues by pressing a keyboard key — including while the video is fullscreen — so that I can simulate the virtual human responding without interrupting the interaction.
2. As a tester, I want to configure hot cues myself by assigning a key, a start time, and a label to each one, so that I can set up the interaction before a session.
3. As a tester, I want to load a video by uploading a file, so that I am not dependent on a specific machine or file path.
4. As a tester, I want to open a sync monitor screen in a separate browser window that mirrors playback events from the main screen, so that I can show the video on the holobox without exposing the controls.
5. As a tester, I want to switch the monitor between a welcome/video state and the tic-tac-toe game state, so that I can return to the beginning of the interaction after a game segment.

---

## Requirements

### Functional

- Hot cue playback: pressing a configured key seeks the video to the cue's start time and begins playback
- Hot cue configuration: each cue has a key, a start time (in seconds), a label, and a color; cues can be cleared in bulk
- Video loading: local file upload; file is persisted to IndexedDB so it can be accessed by the monitor window without re-uploading
- Sync screen: a separate browser window that mirrors playback state (play, pause, seek, segment trigger) via BroadcastChannel; no WebSocket or server required
- Monitor mode switching: a tic-tac-toe cue switches the monitor to the game, while a welcome/start/home/reset cue or the Welcome button returns the monitor to the normal video state
- Manual game background changes: while tic-tac-toe is active, non-mode hot cues manually jump the game background video to the cue timestamp

---

## Layout

### Main screen (control view)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  VIDEO PLAYER                      │
│                 (drop zone until                   │
│                  file is loaded)                   │
│  ▶ ────────────────────────────────────────────   │
├────────────────────────────────────────────────────┤
│  [K | 1:32 | Hello!]  [M | 1:11 | Nooo!]  [+]    │
│                                      [Clear cues]  │
└────────────────────────────────────────────────────┘
```

### Sync screen (holobox view)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  VIDEO PLAYER                      │
│               (no player controls)                 │
│                                                    │
└────────────────────────────────────────────────────┘
```

- No hot cue bar, no controls visible
- Reacts to BroadcastChannel messages from the main screen
- On first open (or after refresh): shows a "Click to sync" overlay to allow the browser to start playback (required by autoplay policy)
- Can display either the synced video/welcome state or the tic-tac-toe game state

---

## Data model

```
HotCue — one per configured key, persisted across sessions

  key        single keystroke, case-insensitive (e.g. "k")
  startTime  position in the video, in seconds (e.g. 92)
  label      human-readable description (e.g. "Hello!")

Video file — persisted in IndexedDB under a fixed key

  Stored as a raw File/Blob so the monitor window can retrieve it
  independently, without relying on a blob URL that only exists in
  the tab that created it. IndexedDB is used specifically because it
  has no meaningful size limit, unlike localStorage or sessionStorage
  which cap out well below typical video file sizes.
```

---

## Key behaviours

### Video loading
- Drop a video file onto the player area, or click to browse and select one
- Accepts any video format the browser natively supports
- After loading, the file is written to IndexedDB; the monitor window reads from there on sync

### Hot cue cards
- Each card shows its trigger key, start time, and label
- Right-click a card to open it for inline editing; click outside or press Escape to close
- Closing a card with **no** key assigned discards it
- Key must be a single character and unique across all cues
- Time accepts `m:ss` format or a raw number of seconds; displayed normalised on save
- Label is free text; no validation
- "Clear cues" button removes all cues after confirmation

### Import / export
- Cues can be exported as a JSON file containing the full list of `HotCue` objects
- A previously exported JSON file can be imported to restore a cue set, replacing the current cues
- Useful for saving session setups and sharing configurations between testers

### Hot cue trigger
- Pressing a configured key seeks the video to the hot cue's start time and begins playback
- The matching card flashes briefly as visual confirmation
- Key presses are ignored while a text input has focus
- Labels containing `tic-tac-toe` or `tic tac toe` switch the monitor to a fresh tic-tac-toe game
- Labels containing `welcome`, `start`, `home`, or `reset` return the monitor to video mode at that cue's start time
- While the monitor is in tic-tac-toe mode, other hot cues manually change the game background video to that cue's start time

### Monitor welcome control
- The main screen includes a Tailwind-styled Welcome button in the controls bar
- Clicking Welcome returns the monitor to the normal video state at `0:00`
- This provides a quick reset without requiring a configured hot cue

### Sync screen
- Opened as a separate browser window (e.g. via an "Open monitor" button)
- Receives BroadcastChannel messages: `play`, `pause`, `seek`, `show_tic_tac_toe`, `show_welcome`, `set_tic_tac_toe_background`
- On load: shows a "Click to sync" overlay; clicking it dismisses the overlay and puts the video into a ready state so autoplay can proceed
- Video renders without native player controls (`controls` attribute omitted)
- When the monitor syncs, the main screen mutes its video automatically to prevent audio echo
- `show_tic_tac_toe` persists game mode and remounts a fresh game session
- `show_welcome` persists video mode and seeks the monitor video to the requested welcome timestamp

### Persistence
- Hot cues are saved to `localStorage` and restored on the next visit
- The loaded video file is saved to IndexedDB and restored on the next visit; the monitor window reads from the same store on sync

---

## Out of scope

- Cloud storage video links (Google Drive, OneDrive, etc.)
- Multiple projects or videos
- Cross-machine collaboration
- Mobile support

---

## Architecture

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (Pages Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |

The initial prototype was built in vanilla HTML and CSS. As other teammates expressed interest in contributing, this stack was chosen to make the codebase more accessible and easier to work in collaboratively.

### Cross-window sync — BroadcastChannel

The [original version](https://holobox-video-controller-957610498090.us-west1.run.app/) sync screen used WebSockets and wrote state to `localStorage` on every millisecond. This caused race conditions, flooded storage, and made the holobox screen laggy and unresponsive — especially on constrained networks.

This version replaces this with the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel_API): same-origin tab-to-tab messaging with no server, no polling, and no shared mutable storage. The main screen posts messages (`play`, `pause`, `seek`) and the sync screen reacts to them. 

This also eliminates the need for a stateful server running at all times, which was an ongoing infrastructure cost for a small internal tool.
