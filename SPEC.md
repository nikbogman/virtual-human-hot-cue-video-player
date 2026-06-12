# Virtual Human Video Segment Player — v2

## Introduction

This tool supports Wizard of Oz testing of a virtual human interaction scenario. A tester manually triggers pre-recorded video segments in real time using **hot cues** — keyboard shortcuts that each play a pre-assigned short video clip — simulating a reactive virtual human for the visitor.

This is a rebuild of the [original version](https://holobox-video-controller-957610498090.us-west1.run.app/).

---

## User Stories

1. As a tester, I want to trigger hot cues by pressing a keyboard key — including while the video is fullscreen — so that I can simulate the virtual human responding without interrupting the interaction.
2. As a tester, I want to configure hot cues myself by assigning a key, a title, a label, and an optional start offset to each one, so that I can set up the interaction before a session.
3. As a tester, I want to load short video clips by uploading them — one clip per cue — so that each segment starts and stops cleanly and I am not dependent on a specific machine or file path.
4. As a tester, I want to open a sync monitor screen in a separate browser window that mirrors playback events from the main screen, so that I can show the video on the holobox without exposing the controls.
5. As a controller running a live session, I want to lay the cues out as a connected graph that mirrors the scenario flow and see which cues come next after the one I just played, so that I can find the right key quickly without losing my place.
6. As a tester, I want to switch the monitor between a welcome/video state and the tic-tac-toe game state, so that I can return to the beginning of the interaction after a game segment.

---

## Requirements

### Functional

- Hot cue playback: pressing a configured key plays that cue's clip from its start offset; when the clip ends, playback stops (no bleed into other footage)
- Hot cue configuration: each cue wraps one uploaded clip and has a key, a title, a label, and an optional start offset (in seconds); cues can be cleared in bulk
- Cue views: cues can be shown as a horizontal list or as a connectable node graph; in the graph, directed "next cue" connections highlight likely follow-up cues when one plays
- Video loading: local upload of one or more short clips; each clip is persisted to IndexedDB so it can be accessed by the monitor window without re-uploading
- Sync screen: a separate browser window that mirrors playback state (play, pause, seek, segment trigger) via BroadcastChannel; no WebSocket or server required
- Monitor mode switching: a tic-tac-toe cue switches the monitor to the game, while a welcome/start/home/reset cue or the Welcome button returns the monitor to the normal video state
- Manual game background changes: while tic-tac-toe is active, non-mode hot cues manually jump the game background video to the cue timestamp

---

## Layout

### Main screen (control view)

```
┌──────────────────────────────────────────────────────────────┐
│                       VIDEO PLAYER                           │
│              (drop zone until clips are loaded)              │
│  ▶ ──────────────────────────────────────────────────────   │
├──────────────────────────────────────────────────────────────┤
│ [≡ List][⤳ Graph] [+ Add clips]   [Monitor][Import][Export][Clear all] │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ K      0:00  │  │ M      0:00  │   [ + ]                  │
│  │ TITLE        │  │ TITLE        │                          │
│  │ Introduction │  │ Tipping point│                          │
│  │ LABEL        │  │ LABEL        │                          │
│  │ Hi, I'm Daan…│  │ Actually — …│                          │
│  └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

- A toggle switches the cue area between **List** (the row above) and **Graph**
- **Graph view**: the same cues as draggable nodes on a dotted canvas; drag between node handles to draw directed "next cue" connections; the playing cue and its connected next cues are highlighted (matching the branching scenario tree)

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
HotCue — one per uploaded clip, persisted across sessions

  id         unique id; also the IndexedDB key for this clip's file
  key        single keystroke, case-insensitive (e.g. "k")
  startTime  optional offset within the clip, in seconds (default 0)
  title      short name for the cue (e.g. "Introduction")
  label      longer text, e.g. the first lines of what's said (preview for the controller)
  fileName   original file name of the uploaded clip

Video files — one clip per cue, persisted in IndexedDB keyed by cue id

  Each clip is stored as a raw File/Blob so the monitor window can
  retrieve it independently, without relying on a blob URL that only
  exists in the tab that created it. IndexedDB is used specifically
  because it has no meaningful size limit, unlike localStorage or
  sessionStorage which cap out well below typical video file sizes.
```

---

## Key behaviours

### Video loading
- Drop one or more video files onto the player area, or click to browse and select them; the "+" card also uploads more clips
- Each uploaded clip becomes its own hot cue card
- Accepts any video format the browser natively supports
- After loading, each clip is written to IndexedDB under its cue id; the monitor window reads from there on sync

### Cue views (list / graph)
- A toggle switches the cue area between two views; both edit and trigger the same cues:
  - **List** — cards in a horizontal row (compact, quick to scan)
  - **Graph** — cards as draggable nodes on a canvas, which the controller can **connect** to lay out the scenario flow (matching the branching scenario tree)
- **Connections** are directed "next cue" links. They are a navigation aid, not automation: pressing a key still plays that clip, and branches (e.g. good/bad) remain the controller's choice — there is no auto-advance
- Drag from a node's bottom handle to another node's top handle to connect; select a connection and press Backspace to remove it
- Node positions and connections are persisted to `localStorage`

### Hot cue cards
- Each card shows its trigger key, start offset, a short **title**, and a longer **label** (the first lines of what's said, so the controller can preview the segment), and represents one uploaded clip
- Click the pencil (or right-click a list card) to open it for inline editing; click outside or press Escape to close
- A cue with no key assigned is kept (the clip is already uploaded) but can't be triggered by keyboard until a key is set
- Key must be a single character and unique across all cues
- Start offset accepts `m:ss` format or a raw number of seconds; displayed normalised on save
- The card `X` (or "Clear all") removes the cue and deletes its clip from IndexedDB
- Label is free text; no validation
- "Clear all" removes every cue and its clip

### Import / export
- Cues can be exported as a JSON file containing the full list of `HotCue` objects (cue config only — the clip files in IndexedDB are not bundled)
- A previously exported JSON file can be imported to restore a cue set, replacing the current cues; on a machine without the matching clips, the cards restore but their videos must be re-uploaded
- Useful for saving session setups and sharing configurations between testers

### Hot cue trigger
- Pressing a configured key loads that cue's clip, seeks to its start offset, and begins playback
- Because each cue is its own clip, playback stops at the clip's end instead of running into other footage
- The playing card lights up (persistent white outline) in both views; cues connected as its "next" steps get a dashed-amber "up next" highlight so the controller can find them quickly
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
- Receives BroadcastChannel messages: `play`, `pause`, `seek` — each carries the active cue's `videoId`, so when a different cue is triggered the monitor loads that clip from IndexedDB before mirroring playback
- On load: shows a "Click to sync" overlay; clicking it dismisses the overlay and puts the video into a ready state so autoplay can proceed
- Video renders without native player controls (`controls` attribute omitted)
- When the monitor syncs, the main screen mutes its video automatically to prevent audio echo
- `show_tic_tac_toe` persists game mode and remounts a fresh game session
- `show_welcome` persists video mode and seeks the monitor video to the requested welcome timestamp

### Persistence
- Hot cues are saved to `localStorage` and restored on the next visit
- The loaded video file is saved to IndexedDB and restored on the next visit; the monitor window reads from the same store on sync

### Tic-Tac-Toe Module

#### Overview

The Tic-Tac-Toe module can be triggered from the main video application using Hot Cues. When activated, the monitor window switches from normal video playback to a playable Tic-Tac-Toe game, allowing visitors to interact with the screen instead of passive VH interractions.

The game is designed as part of the Holobox experience and can dynamically synchronize its background video with timestamps from the main video player.

#### Features

##### Interactive Gameplay
* Player competes against a computer opponent.
* Human player uses "O"/ according Star Wars "dark side" element.
* Computer uses "X", according Star Wars "light side" element.
* Computer performs a move after a short thinking delay.
* Win, loss, and draw conditions are automatically detected.
* Players can immediately start a new game after completion.

##### Automatic Game Logic
The game checks all possible winning combinations:

* Horizontal rows
* Vertical columns
* Diagonal lines

A match ends when:

* Three identical symbols appear in a winning line.
* The board becomes full without a winner (draw).
* The controller behind the VH switches back to video mode.

##### Dynamic Background Video
The Tic-Tac-Toe screen contains a background video that can be controlled from the main application.

When a Hot Cue is triggered while the game is active:

* The game background video jumps to the selected timestamp.
* Playback automatically continues from the chosen position.
* This allows different game moments to be synchronized with the VH reaction states. 

##### Monitor Integration
The game is displayed inside the monitor window rather than the control interface.

The monitor can switch between:

1. Welcome Mode
   * Standard video playback.

2. Tic-Tac-Toe Mode
   * Interactive game screen.
   * Independent game state.
   * Video background synchronized through Hot Cues.

#### Gameplay Flow

##### Start
1. Game loads.
2. Empty board is created.
3. Computer begins the match.
4. Computer places an **X** after a short delay.

##### Player Turn
1. User clicks an empty square.
2. An **O** is placed.
3. Game checks for victory or draw.

##### Computer Turn
1. Computer selects a random empty square.
2. An **X** is placed.
3. Game checks for victory or draw.

##### End Game
If a result is detected:

* "X wins!"
* "O wins!"
* "Draw!"

The player is presented with:

* **Yes** → Start a new game.
* **No** → Hide the board and return control to the controller behind the VH.

---

## Out of scope

- Cloud storage video links (Google Drive, OneDrive, etc.)
- Multiple projects / separate cue sets
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
| Node graph | React Flow (`@xyflow/react`) |

The initial prototype was built in vanilla HTML and CSS. As other teammates expressed interest in contributing, this stack was chosen to make the codebase more accessible and easier to work in collaboratively.

### Cross-window sync — BroadcastChannel

The [original version](https://holobox-video-controller-957610498090.us-west1.run.app/) sync screen used WebSockets and wrote state to `localStorage` on every millisecond. This caused race conditions, flooded storage, and made the holobox screen laggy and unresponsive — especially on constrained networks.

This version replaces this with the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel_API): same-origin tab-to-tab messaging with no server, no polling, and no shared mutable storage. The main screen posts messages (`play`, `pause`, `seek`, each tagged with the active cue's `videoId`) and the sync screen reacts to them, switching clips as needed. 

This also eliminates the need for a stateful server running at all times, which was an ongoing infrastructure cost for a small internal tool.
