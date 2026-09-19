import { challenges } from "./challenges.js";
import { currentChallenge, type GameState } from "./game.js";
import type { EditorState } from "./editor.js";

const ESC = "\u001b[";
const RESET = `${ESC}0m`;

export function renderGame(state: GameState, now = Date.now()): string {
  if (state.finished) {
    return renderFinished(state);
  }

  const challenge = currentChallenge(state);
  if (challenge === undefined) {
    return `${ESC}2J${ESC}H${paint("1;31", "No challenge loaded.")}\n`;
  }

  const elapsed = formatSeconds(Math.max(0, (now - state.startedAt) / 1000));
  const target = challenge.target.length === 0 ? "(empty)" : challenge.target;
  const goalCursor = `${" ".repeat("Target: ".length + challenge.targetCursor)}^`;

  const lines = [
    paint("1;36", "TYPEGOD") + paint("2", "  Unix keyboard drills"),
    "",
    `${paint("1", `Challenge ${state.challengeIndex + 1}/${challenges.length}`)}  ${challenge.title}`,
    paint("2", challenge.instruction),
    `Learn: ${paint("1;33", challenge.focusLabel)}`,
    "",
    `Target: ${target}`,
    paint("2;36", goalCursor),
    `Edit:   ${renderEditorLine(state.editor)}`,
    "",
    `${paint("2", "Enter")} submit  ${paint("2", "Esc")} reset  ${paint("2", "Ctrl+C")} quit`,
    `Time ${elapsed}   Keys ${state.keyCount}   Mistakes ${state.mistakes}`,
    state.message.length > 0 ? paint("33", state.message) : paint("2", challenge.hint),
  ];

  return `${ESC}2J${ESC}H${lines.join("\n")}\n`;
}

function renderFinished(state: GameState): string {
  const lines = [
    paint("1;36", "TYPEGOD COMPLETE"),
    "",
    `You completed ${state.completed}/${challenges.length} drills.`,
    `Final score: ${paint("1;33", String(state.totalScore))}`,
    "",
    paint("2", "Press r to play again or Ctrl+C to quit."),
  ];
  return `${ESC}2J${ESC}H${lines.join("\n")}\n`;
}

export function renderEditorLine(editor: EditorState): string {
  const characters = Array.from(editor.text);
  const cursor = Math.max(0, Math.min(editor.cursor, characters.length));
  const before = characters.slice(0, cursor).join("");
  const current = characters[cursor] ?? " ";
  const after = characters.slice(cursor + 1).join("");
  return `${before}${paint("7", current)}${after}`;
}

function paint(code: string, value: string): string {
  return `${ESC}${code}m${value}${RESET}`;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
