# Implementation Plan

## What we are building

A single-page browser tool for Wizard of Oz testing. The tester loads a video, assigns keyboard keys to video segments (start time + label), then runs the session in fullscreen while triggering segments with keystrokes. The app logs every key press in order.

---

## File structure

```
index.html      — markup and layout
style.css       — styles
app.js          — all logic
```

No build tools, no bundlers, no frameworks. Plain HTML/CSS/JS, opened directly in a browser.

---

## Layout

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                  VIDEO PLAYER                      │
│                                                    │
│  ▶ ──────────────────────────────────────── [⛶]  │
├────────────────────────────────────────────────────┤
│  [+]  [K | 1:32 | Hello!]  [M | 1:11 | Nooo!]    │
└────────────────────────────────────────────────────┘
```

- **Video player**: full width, native controls, fullscreen button
- **Hot cue bar**: a row of cards below the video — each card shows its trigger key, start time, and label. Cards are clickable and editable inline. A `+` card adds a new one.

---

## Data model

```js
// Segment — one per configured key
{
  key: "k",           // single keystroke (case-insensitive)
  startTime: 92,      // in seconds
  label: "Hello!"
}

// Session event — appended on every trigger
{
  key: "k",
  label: "Hello!",
  startTime: 92,
  triggeredAt: 1234567890123   // Date.now()
}
```

Segments are persisted in `localStorage` (small, structured data — fine here). Video is held as a Blob URL in memory for the session.

---

## Implementation phases

### Phase 1 — Video player
- HTML skeleton: video full width, hot cue bar below
- `<video>` element with native controls
- File upload input: on file select, create `URL.createObjectURL(file)` and set as `video.src`
- Fullscreen button: calls `videoContainer.requestFullscreen()`
- `document.keydown` listener wired up (works in fullscreen without any special handling)

### Phase 2 — Hot cue bar
- Render one card per segment in the hot cue bar
- Each card shows: trigger key (badge), start time, label
- Clicking a card opens it into inline edit mode: key input, time input, label input, delete button
- A `+` card at the end adds a new empty segment
- On any change, save to `localStorage` and re-render
- Parse/validate: key must be a single character and unique, time must be a valid number

### Phase 3 — Keyboard trigger
- On `keydown`, check if `event.key` matches any configured segment
- If match: `video.currentTime = segment.startTime`, `video.play()`
- Highlight the matching key-card briefly (visual feedback for the tester)
- Guard: ignore key events when the tester is typing in an input field (`event.target.tagName === 'INPUT'`)

### Phase 4 — Session logging
- On each successful trigger, push a session event to an in-memory array
- Display the log in a collapsible section below the hot cue bar: key, label, time triggered
- "Export log" button: serialises the array to JSON and downloads it as a file

### Phase 5 — Google Drive link
- Input field to paste a Google Drive share URL
- Parse the file ID from the URL pattern `drive.google.com/file/d/<ID>/`
- Construct a direct streamable URL and set as `video.src`
- Note: CORS may block direct streaming — fallback is to show an embed or warn the user

---

## Key technical decisions

| Decision | Choice | Reason |
|---|---|---|
| Framework | None | Requirement: minimal dependencies |
| Video source | `URL.createObjectURL()` | No server needed, works offline |
| Segment storage | `localStorage` | Small structured data, survives page refresh |
| Session log storage | In-memory array | Ephemeral per session, exported on demand |
| Keyboard in fullscreen | `document.addEventListener('keydown')` | Browser fires keyboard events on document regardless of fullscreen state |
| Styling | Plain CSS | No framework needed at this scale |

---

## Out of scope (v1)

- Multiple projects or videos
- Cloud sync or backend
- Real-time collaboration
- Mobile support
