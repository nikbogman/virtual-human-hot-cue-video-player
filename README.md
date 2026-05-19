# Virtual Human Video Segment Player

## Introduction

This tool exists to support Wizard of Oz testing of a virtual human interaction scenario. The virtual human is represented as a pre-recorded video, and a tester manually triggers different video segments in real time using keyboard shortcuts — simulating the illusion of a reactive virtual human for the visitor.

The Mindlabs team behind the virtual human built a similar internal tool, but it only runs on macOS. Since 3 out of 6 team members (including the tester) are on Windows, a cross-platform browser-based alternative is needed. The goal is to have something working immediately, starting with a single video and single project, with room to extend later.

---

## User Stories

1. As a tester, I want the app to have a video player that I can make fullscreen, so that the setup looks like the original installation and the visitor experiences it as intended.
2. As a tester, I want to trigger specific video segments by pressing a keyboard key, so that I can simulate the virtual human responding without interrupting the video.
3. As a tester, I want to trigger segments while the video player is in fullscreen, so that I do not have to exit fullscreen and interrupt the interaction.
4. As a tester, I want to define segments myself by assigning a start time and a label to each key, so that I can configure the interaction before a test session.
5. As a tester, I want the app to record which keys were pressed and in what sequence, so that I can review what happened during the session.
6. As a tester, I want to load a video by uploading a file or pasting a Google Drive link, so that I am not dependent on a specific machine or file path.

---

## Requirements

### Functional
- Keyboard-triggered segment playback: pressing a configured key seeks the video to the assigned start time and plays from there
- Segment configuration: each key can be assigned a start time (in seconds) and a human-readable label
- Session logging: the app tracks the sequence and timing of key presses during a session
- Video loading: support local file upload and Google Drive link as input methods

### Technical
- Runs in the browser on any OS (no native bindings, no platform-specific dependencies)
- Video stored in the browser
- Built with as few frameworks and dependencies as possible
- Initially scoped to a single video and single project; designed to be extended
