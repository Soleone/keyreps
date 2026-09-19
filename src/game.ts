import { challenges, type Challenge } from "./challenges.js";
import {
  applyKey,
  createEditor,
  type EditorAction,
  type EditorState,
} from "./editor.js";
import type { Key } from "./types.js";

export type KeyPerformance = "perfect" | "close" | "poor";

const CLOSE_KEY_TOLERANCE = 2;

export interface LessonNotification {
  performance: KeyPerformance;
  text: string;
}

export interface GameState {
  challengeIndex: number;
  editor: EditorState;
  keyCount: number;
  mistakes: number;
  focusUsed: boolean;
  totalKeys: number;
  completed: number;
  lastKeyCount: number | null;
  lastPerformance: KeyPerformance | null;
  notification: LessonNotification | null;
  finished: boolean;
}

export interface KeyResult {
  state: GameState;
  quit: boolean;
}

export function startGame(): GameState {
  return makeChallengeState(0, 0);
}

export function currentChallenge(state: GameState): Challenge | undefined {
  return challenges[state.challengeIndex];
}

/**
 * Expert drills are memory tests. Reveal their instructions only after the
 * player has spent more than the ideal number of key presses or made a
 * failed/unhandled attempt.
 */
export function shouldShowInstructions(state: GameState, challenge?: Challenge): boolean {
  const activeChallenge = challenge ?? currentChallenge(state);
  return activeChallenge === undefined
    || activeChallenge.tier !== "expert"
    || state.keyCount > activeChallenge.idealKeys
    || state.mistakes > 0;
}

export function keyPerformance(keyCount: number, idealKeys: number): KeyPerformance {
  if (keyCount <= idealKeys) {
    return "perfect";
  }

  return keyCount <= idealKeys + CLOSE_KEY_TOLERANCE ? "close" : "poor";
}

export function handleKey(state: GameState, key: Key): KeyResult {
  if (key.type === "control" && key.key === "c") {
    return { state, quit: true };
  }

  if (state.finished) {
    if (key.type === "text" && key.value.toLowerCase() === "r") {
      return { state: startGame(), quit: false };
    }
    return { state, quit: false };
  }

  if (key.type === "page") {
    return navigateLesson(state, key.direction);
  }

  const challenge = currentChallenge(state);
  if (challenge === undefined) {
    return { state: { ...state, finished: true }, quit: false };
  }

  if (key.type === "escape") {
    return {
      state: makeChallengeState(
        state.challengeIndex,
        state.totalKeys,
        state.completed,
      ),
      quit: false,
    };
  }

  if (key.type === "enter") {
    return submit(state, challenge);
  }

  const applied = applyKey(state.editor, key);
  if (!applied.handled) {
    return {
      state: {
        ...state,
        mistakes: state.mistakes + 1,
        lastPerformance: null,
      },
      quit: false,
    };
  }

  const focusUsed = state.focusUsed || applied.action === challenge.focus;
  const keyPresses = key.type === "text" ? Array.from(key.value).length : 1;

  return {
    state: {
      ...state,
      editor: applied.state,
      keyCount: state.keyCount + keyPresses,
      focusUsed,
    },
    quit: false,
  };
}

function navigateLesson(state: GameState, direction: "up" | "down"): KeyResult {
  const offset = direction === "up" ? 1 : -1;
  const challengeIndex = state.challengeIndex + offset;

  if (challengeIndex < 0 || challengeIndex >= challenges.length) {
    return { state, quit: false };
  }

  return {
    state: makeChallengeState(
      challengeIndex,
      state.totalKeys,
      state.completed,
      state.lastKeyCount,
      state.lastPerformance,
    ),
    quit: false,
  };
}

function submit(state: GameState, challenge: Challenge): KeyResult {
  if (!solved(state.editor, challenge)) {
    return {
      state: {
        ...state,
        mistakes: state.mistakes + 1,
        lastPerformance: null,
      },
      quit: false,
    };
  }

  const performance = keyPerformance(state.keyCount, challenge.idealKeys);
  const totalKeys = state.totalKeys + state.keyCount;
  const completed = state.completed + 1;

  if (state.challengeIndex === challenges.length - 1) {
    return {
      state: {
        ...state,
        totalKeys,
        completed,
        lastKeyCount: state.keyCount,
        lastPerformance: performance,
        notification: lessonCompleteNotification(performance),
        finished: true,
      },
      quit: false,
    };
  }

  return {
    state: makeChallengeState(
      state.challengeIndex + 1,
      totalKeys,
      completed,
      state.keyCount,
      performance,
      lessonCompleteNotification(performance),
    ),
    quit: false,
  };
}

function solved(editor: EditorState, challenge: Challenge): boolean {
  return editor.text === challenge.target && editor.cursor === challenge.targetCursor;
}

function lessonCompleteNotification(performance: KeyPerformance): LessonNotification {
  return {
    performance,
    text: "Lesson complete",
  };
}

function makeChallengeState(
  challengeIndex: number,
  totalKeys: number,
  completed = 0,
  lastKeyCount: number | null = null,
  lastPerformance: KeyPerformance | null = null,
  notification: LessonNotification | null = null,
): GameState {
  const challenge = challenges[challengeIndex];
  if (challenge === undefined) {
    return {
      challengeIndex,
      editor: createEditor(),
      keyCount: 0,
      mistakes: 0,
      focusUsed: false,
      totalKeys,
      completed,
      lastKeyCount,
      lastPerformance,
      notification,
      finished: true,
    };
  }

  return {
    challengeIndex,
    editor: createEditor(challenge.start, challenge.startCursor),
    keyCount: 0,
    mistakes: 0,
    focusUsed: false,
    totalKeys,
    completed,
    lastKeyCount,
    lastPerformance,
    notification,
    finished: false,
  };
}

export function actionLabel(action: EditorAction | null): string {
  return action === null ? "unknown" : action;
}
