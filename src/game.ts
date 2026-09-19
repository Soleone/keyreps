import { challenges, type Challenge } from "./challenges.js";
import {
  applyKey,
  createEditor,
  type EditorAction,
  type EditorState,
} from "./editor.js";
import type { Key } from "./types.js";

export interface GameState {
  challengeIndex: number;
  editor: EditorState;
  startedAt: number;
  keyCount: number;
  mistakes: number;
  focusUsed: boolean;
  totalScore: number;
  completed: number;
  lastScore: number | null;
  message: string;
  finished: boolean;
}

export interface KeyResult {
  state: GameState;
  quit: boolean;
}

export function startGame(now = Date.now()): GameState {
  return makeChallengeState(0, 0, now, "");
}

export function currentChallenge(state: GameState): Challenge | undefined {
  return challenges[state.challengeIndex];
}

export function handleKey(state: GameState, key: Key, now = Date.now()): KeyResult {
  if (key.type === "control" && key.key === "c") {
    return { state, quit: true };
  }

  if (state.finished) {
    if (key.type === "text" && key.value.toLowerCase() === "r") {
      return { state: startGame(now), quit: false };
    }
    return { state, quit: false };
  }

  const challenge = currentChallenge(state);
  if (challenge === undefined) {
    return { state: { ...state, finished: true }, quit: false };
  }

  if (key.type === "escape") {
    return {
      state: makeChallengeState(
        state.challengeIndex,
        state.totalScore,
        now,
        "Challenge reset.",
      ),
      quit: false,
    };
  }

  if (key.type === "enter") {
    return submit(state, challenge, now);
  }

  const applied = applyKey(state.editor, key);
  if (!applied.handled) {
    return {
      state: {
        ...state,
        mistakes: state.mistakes + 1,
        message: "That key is not part of this drill.",
      },
      quit: false,
    };
  }

  const focusUsed = state.focusUsed || applied.action === challenge.focus;
  const message =
    !state.focusUsed && applied.action === challenge.focus
      ? `Shortcut registered: ${challenge.focusLabel}.`
      : state.message;

  return {
    state: {
      ...state,
      editor: applied.state,
      keyCount: state.keyCount + 1,
      focusUsed,
      message,
    },
    quit: false,
  };
}

function submit(state: GameState, challenge: Challenge, now: number): KeyResult {
  if (!solved(state.editor, challenge)) {
    return {
      state: {
        ...state,
        mistakes: state.mistakes + 1,
        message: "Not quite. Match the target and leave the cursor at the goal marker.",
      },
      quit: false,
    };
  }

  const score = scoreChallenge(state, challenge, now);
  const totalScore = state.totalScore + score;
  const completed = state.completed + 1;

  if (state.challengeIndex === challenges.length - 1) {
    return {
      state: {
        ...state,
        totalScore,
        completed,
        lastScore: score,
        message: `All drills complete. Final score: ${totalScore}.`,
        finished: true,
      },
      quit: false,
    };
  }

  return {
    state: makeChallengeState(
      state.challengeIndex + 1,
      totalScore,
      now,
      state.focusUsed
        ? `Correct. +${score} points.`
        : `Correct. +${score} points. Use ${challenge.focusLabel} next time for the shortcut bonus.`,
      completed,
      score,
    ),
    quit: false,
  };
}

function solved(editor: EditorState, challenge: Challenge): boolean {
  return editor.text === challenge.target && editor.cursor === challenge.targetCursor;
}

function scoreChallenge(state: GameState, challenge: Challenge, now: number): number {
  const elapsedSeconds = Math.max(0, (now - state.startedAt) / 1000);
  const extraKeys = Math.max(0, state.keyCount - challenge.idealKeys);
  const accuracy = Math.max(0, 100 - state.mistakes * 10 - extraKeys * 2);
  const speedBonus = Math.max(0, Math.round(40 - elapsedSeconds * 2));
  const shortcutBonus = state.focusUsed ? 30 : 0;
  return accuracy + speedBonus + shortcutBonus;
}

function makeChallengeState(
  challengeIndex: number,
  totalScore: number,
  now: number,
  message: string,
  completed = 0,
  lastScore: number | null = null,
): GameState {
  const challenge = challenges[challengeIndex];
  if (challenge === undefined) {
    return {
      challengeIndex,
      editor: createEditor(),
      startedAt: now,
      keyCount: 0,
      mistakes: 0,
      focusUsed: false,
      totalScore,
      completed,
      lastScore,
      message,
      finished: true,
    };
  }

  return {
    challengeIndex,
    editor: createEditor(challenge.start, challenge.startCursor),
    startedAt: now,
    keyCount: 0,
    mistakes: 0,
    focusUsed: false,
    totalScore,
    completed,
    lastScore,
    message,
    finished: false,
  };
}

export function actionLabel(action: EditorAction | null): string {
  return action === null ? "unknown" : action;
}
