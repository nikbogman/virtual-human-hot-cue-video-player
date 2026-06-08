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
6. As a user, I want to be welcomed by a video that I can interact with.
7. As a tester, I want to be able to run the 3 states of the poking feature, idle/ poked/ touched_screen and see how they change in the separate monitor view. 

---

## Requirements

### Functional

- Hot cue playback: pressing a configured key plays that cue's clip from its start offset; when the clip ends, playback stops (no bleed into other footage)
- Hot cue configuration: each cue wraps one uploaded clip and has a key, a title, a label, and an optional start offset (in seconds); cues can be cleared in bulk
- Cue views: cues can be shown as a horizontal list or as a connectable node graph; in the graph, directed "next cue" connections highlight likely follow-up cues when one plays
- Video loading: local upload of one or more short clips; each clip is persisted to IndexedDB so it can be accessed by the monitor window without re-uploading
- Sync screen: a separate browser window that mirrors playback state (play, pause, seek, segment trigger) via BroadcastChannel; no WebSocket or server required

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
- A video with a title *"idle"* runs an **InteractiveOverlay** function that enables for the user to interact with the character displayed on the monitor as the videos automatically play and go back to idle after 3 sec. 

### Sync screen
- Opened as a separate browser window (e.g. via an "Open monitor" button)
- Receives BroadcastChannel messages: `play`, `pause`, `seek` — each carries the active cue's `videoId`, so when a different cue is triggered the monitor loads that clip from IndexedDB before mirroring playback
- On load: shows a "Click to sync" overlay; clicking it dismisses the overlay and puts the video into a ready state so autoplay can proceed
- Video renders without native player controls (`controls` attribute omitted)
- When the monitor syncs, the main screen mutes its video automatically to prevent audio echo

### Persistence
- Hot cues are saved to `localStorage` (key `hotCues`) and restored on the next visit
- The graph layout — node positions and "next cue" connections — is saved to `localStorage` (keys `cuePositions` and `cueLinks`)
- Each uploaded clip is saved to IndexedDB under its cue id and restored on the next visit; the monitor window reads clips from the same store on sync

---

## Poking function Module

### Overview

The poking function model can be started by putting the **title** of any video to `idle`. On top a transparent overlay will be displayed that will differentiate between where the user can poke the character and where they will touch the backgorund/ screen. Based on where the user touches the screen, a correpsonding video will play automatically and will dissapear in 3 seconds, coming back to the *idle* state. 

## Function logic 

The whole function is communicating through the files `poked_game.jsx`, `index.tsx`, `monitor.tsx` and `CueCardFace.tsx`. The overlay is established in `poked_game.jsx` and is put over the video with the title `idle`. The idle title is checked from the `CueCardFace.tsx` and `monitor.tsx` is listening for the cue through a `useSyncBroadcast` and is passed from the controller-  `index.tsx`. At the end the monitor for the users, shows the overlay only when idle video is active. The overlay responds to user click/ touches and shows the corresponding video. 

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