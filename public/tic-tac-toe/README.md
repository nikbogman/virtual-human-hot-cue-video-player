# Tic-Tac-Toe Module

## Overview
The Tic-Tac-Toe module can be triggered from the main video application using Hot Cues. When activated, the monitor window switches from normal video playback to a playable Tic-Tac-Toe game, allowing visitors to interact with the screen instead of passive VH interractions.

The game is designed as part of the Holobox experience and can dynamically synchronize its background video with timestamps from the main video player.

## Features

### Interactive Gameplay
* Player competes against a computer opponent.
* Human player uses "O"/ according Star Wars "dark side" element.
* Computer uses "X", according Star Wars "light side" element.
* Computer performs a move after a short thinking delay.
* Win, loss, and draw conditions are automatically detected.
* Players can immediately start a new game after completion.

### Automatic Game Logic
The game checks all possible winning combinations:
* Horizontal rows
* Vertical columns
* Diagonal lines

A match ends when:
* Three identical symbols appear in a winning line.
* The board becomes full without a winner (draw).
* The controller behind the VH switches back to video mode.

### Dynamic Background Video
The Tic-Tac-Toe screen contains a background video that can be controlled from the main application.

When a Hot Cue is triggered while the game is active:
* The game background video jumps to the selected timestamp.
* Playback automatically continues from the chosen position.
* This allows different game moments to be synchronized with the VH reaction states. 

### Monitor Integration
The game is displayed inside the monitor window rather than the control interface.

The monitor can switch between:

1. Welcome Mode
   * Standard video playback.

2. Tic-Tac-Toe Mode
   * Interactive game screen.
   * Independent game state.
   * Video background synchronized through Hot Cues.

## Hot Cue Integration
The Tic-Tac-Toe module is controlled through the BroadcastChannel communication system.

### Launching the Game
When a Hot Cue label contains:
* `tic tac toe`
* `tic-tac-toe`

the application:
1. Stores the monitor mode as `tic-tac-toe`.
2. Sends a `show_tic_tac_toe` message.
3. Creates a fresh game session on the monitor.

### Returning to Welcome Screen
When a Hot Cue label contains:
* `welcome`
* `start`
* `home`
* `reset`

the application:
1. Stores the monitor mode as `video`.
2. Sends a `show_welcome` message.
3. Returns the monitor to normal synchronized video playback.

## Gameplay Flow

### Start
1. Game loads.
2. Empty board is created.
3. Computer begins the match.
4. Computer places an **X** after a short delay.

### Player Turn
1. User clicks an empty square.
2. An **O** is placed.
3. Game checks for victory or draw.

### Computer Turn
1. Computer selects a random empty square.
2. An **X** is placed.
3. Game checks for victory or draw.

### End Game
If a result is detected:
* "X wins!"
* "O wins!"
* "Draw!"

The player is presented with:
* **Yes** → Start a new game.
* **No** → Hide the board and return control to the controller behind the VH.

## Technical Implementation

### Technologies
* React
* TypeScript
* BroadcastChannel API
* HTML5 Video

### State Management
The game tracks:
* board - Current game board
* humanTurn - Determines whether user input is allowed
* status - Displays win/draw messages
* showChoices - Shows replay buttons
* showGrid - Controls board visibility

### Communication Events
The following BroadcastChannel events are used:
* show_tic_tac_toe - Opens a new game session
* show_welcome - Returns monitor to video mode
* set_tic_tac_toe_background - Updates game background timestamp

## User Story

**As a visitor**, I want to play a simple game during the Holobox experience so that I can actively engage with the content instead of watching video playback.

**As a tester**, I want the game to launch automatically through Hot Cues so that interactions can be synchronized with predefined moments in the presentation.

**As a tester**, I want to change the game background using video timestamps so that visual storytelling can continue while the visitor is playing.
