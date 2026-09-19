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
  message: string;
  finished: boolean;
}

export interface KeyResult {
  state: GameState;
  quit: boolean;
}

export function startGame(): GameState {
  return makeChallengeState(0, 0, "");
}

export function currentChallenge(state: GameState): Challenge | undefined {
  return challenges[state.challengeIndex];
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

  const challenge = currentChallenge(state);
  if (challenge === undefined) {
    return { state: { ...state, finished: true }, quit: false };
  }

  if (key.type === "escape") {
    return {
      state: makeChallengeState(
        state.challengeIndex,
        state.totalKeys,
        "Challenge reset.",
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
        message: "That key is not part of this drill.",
      },
      quit: false,
    };
  }

  const focusUsed = state.focusUsed || applied.action === challenge.focus;
  const keyPresses = key.type === "text" ? Array.from(key.value).length : 1;
  const message =
    !state.focusUsed && applied.action === challenge.focus
      ? `Shortcut registered: ${challenge.focusLabel}.`
      : state.message;

  return {
    state: {
      ...state,
      editor: applied.state,
      keyCount: state.keyCount + keyPresses,
      focusUsed,
      message,
    },
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
        message: "Not quite. Match the target and leave the cursor at the goal marker.",
      },
      quit: false,
    };
  }

  const performance = keyPerformance(state.keyCount, challenge.idealKeys);
  const totalKeys = state.totalKeys + state.keyCount;
  const completed = state.completed + 1;
  const message = resultMessage(state, challenge, performance);

  if (state.challengeIndex === challenges.length - 1) {
    return {
      state: {
        ...state,
        totalKeys,
        completed,
        lastKeyCount: state.keyCount,
        lastPerformance: performance,
        message: `All drills complete. Used ${totalKeys} keyboard presses.`,
        finished: true,
      },
      quit: false,
    };
  }

  return {
    state: makeChallengeState(
      state.challengeIndex + 1,
      totalKeys,
      message,
      completed,
      state.keyCount,
      performance,
    ),
    quit: false,
  };
}

function solved(editor: EditorState, challenge: Challenge): boolean {
  return editor.text === challenge.target && editor.cursor === challenge.targetCursor;
}

function resultMessage(
  state: GameState,
  challenge: Challenge,
  performance: KeyPerformance,
): string {
  const keyLabel = state.keyCount === 1 ? "key press" : "key presses";
  const rating = performance === "perfect"
    ? "Perfect."
    : performance === "close"
      ? "Close to the expected amount."
      : "More than expected.";
  const outcome = performance === "poor" ? "Solved, but" : "Solved.";
  const shortcutReminder = state.focusUsed
    ? ""
    : ` Use ${challenge.focusLabel} next time for the shortcut.`;
  return `${outcome} ${state.keyCount} ${keyLabel}. ${rating}${shortcutReminder}`;
}

function makeChallengeState(
  challengeIndex: number,
  totalKeys: number,
  message: string,
  completed = 0,
  lastKeyCount: number | null = null,
  lastPerformance: KeyPerformance | null = null,
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
      message,
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
    message,
    finished: false,
  };
}

export function actionLabel(action: EditorAction | null): string {
  return action === null ? "unknown" : action;
}
