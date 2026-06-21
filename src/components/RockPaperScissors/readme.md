# Rock paper scissors game

## Overview

This rock paper scissors game is an interactive mini game that is integrated into the video cue player. The player will play against Yoda by doing hand gestures in front of the camera. The hand gestures will be detected in real time and compared against a random generated move for Yoda.

The game does use video clips for the introduction and the round outcomes. This is to create a virtual human effect experience where Yoda reacts to the player's moves.


## How to start the game

1. Open the video cue player and monitor windows.
2. Make sure that all the rock paper scissors video clips are assigned to their corresponding cue bindings:

   * intro
   * rock_win
   * rock_lose
   * rock_draw
   * paper_win
   * paper_lose
   * paper_draw
   * scissors_win
   * scissors_lose
   * scissors_draw
3. Assign a cue to the `rps_start` binding.
4. Start video playback in the video cue player.
5. Trigger the cue assigned to `rps_start`.
6. The monitor will switch to the rock paper scissors mode and play the intro video.
7. Once the intro video finishes, the game will begin and wait for the player to perform a hand gesture.


## Gameplay

The game follows the standard rock paper scissors rules:

* Rock defeats scissors
* Paper defeats rock
* Scissors defeats paper
* Same choice will result in a draw

The game is played as the best out of 3

* First player to reach 2 wins is the winner.
* Draw rounds do not affect the score.
* The player can restart the game after it done.


## Game flow

1. Game starts.
2. Intro video is played.
3. The system waits for a valid hand gesture.
4. The player's gesture is detected.
5. Yoda randomly selects rock, paper, or scissors.
6. The round result is calculated.
7. A corresponding reaction video is played.
8. Scores are updated.
9. If neither player has reached 2 wins, the next round will start.
10. Once a player reaches 2 wins, the game ends and can be restarted.


## Gesture detection

The game uses the custom `useHandGesture()` hook to identify player gestures.

The supported gestures:

* Rock
* Paper
* Scissors

To prevent accidental detections:

* The detected gesture must remain stable for 800 milliseconds.
* Duplicate consecutive detections are ignored.



## Video system

Each round outcome is linked to a specific video clip.

### Win clips

* rock_win
* paper_win
* scissors_win

### Lose clips

* rock_lose
* paper_lose
* scissors_lose

### Draw clips

* rock_draw
* paper_draw
* scissors_draw

### Other clips

* intro

The right clip is selected based on the player's move and the round result.

Example:

Player chooses rock

Yoda chooses scissors

Result = win

Video played = rock_win



## Score system

### Player win

* Player score increases by 1.

### Yoda win

* Yoda score increases by 1.

### Draw

* No score change.

### Victory 

When either score reaches 2:

* Game state is locked
* Winner is shown
* Player can restart the game



## Components

### RockPaperScissors.tsx

Main game component responsible for:

* Round logic
* Score tracking
* Video playback
* Game state management

### useHandGesture.ts

Custom hook responsible for:

* Webcam processing
* Gesture recognition
* Return detected gestures

### Monitor.tsx

Responsible for:

* Loading game clips
* Displaying the game overlay
* To synchronize game state with the video cue player

### useSyncBroadcast.ts

Handles communication between:

* Video cue player
* Monitor Window

Using the BroadcastChannel API.



## Technologies used

* React
* Next.js
* TypeScript
* BroadcastChannel API
* HTML5 Video
* mediapipe/tasks-vision


## Future improvements

* Timer to know the when the next round starts
* Smarter Yoda AI
* Animated scoreboards

## Author
Melany Lara Reyes
