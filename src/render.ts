import { challenges } from "./challenges.js";
import { currentChallenge, type GameState } from "./game.js";
import type { EditorState } from "./editor.js";
import { createThemeManager, type ThemeColor } from "./theme.js";

const ESC = "\u001b[";
const RESET = `${ESC}0m`;
const CLEAR_SCREEN = `${ESC}2J${ESC}H`;
const PANEL_WIDTH = 76;
const PANEL_CONTENT_WIDTH = PANEL_WIDTH - 4;
const ANSI_SEQUENCE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const themeManager = createThemeManager();

export function refreshTheme(): boolean {
  return themeManager.refresh();
}

export function renderGame(state: GameState, now = Date.now()): string {
  if (state.finished) {
    return renderFinished(state, now);
  }

  const challenge = currentChallenge(state);
  if (challenge === undefined) {
    return `${CLEAR_SCREEN}${paint("error", "No challenge loaded.", "1")}\n`;
  }

  const elapsed = formatSeconds(Math.max(0, (now - state.startedAt) / 1000));
  const drillName = challenge.id.replaceAll("-", " ").toUpperCase();
  const challengeContent = [
    `  ${paint("text", challenge.title, "1")}`,
    ...wrapText(challenge.instruction, PANEL_CONTENT_WIDTH - 4).map(
      (line) => `  ${line}`,
    ),
    "",
    paint("info", "SHORTCUT", "2"),
    `  ${paint("accent", challenge.focusLabel, "1")}`,
    "",
    paint("info", "TARGET  ·  GOAL MARKER", "2"),
    `  ${paint("dim", formatTarget(challenge.target), "2")}`,
    `  ${paint("warning", targetMarker(challenge.target, challenge.targetCursor), "2")}`,
    "",
    paint("secondary", "EDITOR", "2"),
    `  ${paint("accent", "$", "1")} ${renderEditorLine(state.editor)}`,
  ];

  const guidanceText = state.message.length > 0 ? state.message : challenge.hint;
  const guidanceRole: ThemeColor = state.message.length > 0 ? "text" : "muted";
  const guidance = [
    `  ${state.message.length > 0 ? paint("warning", "STATUS", "1") : paint("info", "HINT", "2")}`,
    ...wrapText(guidanceText, PANEL_CONTENT_WIDTH - 4).map(
      (line) => `  ${paint(guidanceRole, line, state.message.length > 0 ? "1" : "2")}`,
    ),
  ];

  const lines = [
    ...renderHeader(state),
    "",
    ...panel(`DRILL ${String(state.challengeIndex + 1).padStart(2, "0")}  ·  ${drillName}`, challengeContent),
    "",
    renderStatsStrip(state, elapsed),
    "",
    ...panel("GUIDANCE", guidance),
    "",
    renderControls(),
  ];

  return `${CLEAR_SCREEN}${lines.join("\n")}\n`;
}

function renderFinished(state: GameState, now: number): string {
  const elapsed = formatSeconds(Math.max(0, (now - state.startedAt) / 1000));
  const result = [
    `  ${paint("success", "All keyboard drills cleared.", "1")}`,
    "",
    `  ${paint("muted", "DRILLS COMPLETED", "2")}  ${paint("text", `${state.completed} / ${challenges.length}`, "1")}`,
    `  ${paint("muted", "FINAL SCORE", "2")}       ${paint("warning", String(state.totalScore), "1")}`,
    state.lastScore === null
      ? ""
      : `  ${paint("muted", "LAST DRILL", "2")}          ${paint("accent", `+${state.lastScore}`, "1")}`,
  ];

  const lines = [
    ...renderHeader(state, "UNIX KEYBOARD KATAS  /  COMPLETE"),
    "",
    ...panel("RUN COMPLETE", result),
    "",
    renderStatsStrip(state, elapsed),
    "",
    `${paint("accent", "R", "1")} play again   ${paint("muted", "CTRL+C", "2")} quit`,
  ];

  return `${CLEAR_SCREEN}${lines.join("\n")}\n`;
}

export function renderEditorLine(editor: EditorState): string {
  const characters = Array.from(editor.text);
  const cursor = Math.max(0, Math.min(editor.cursor, characters.length));
  const before = characters.slice(0, cursor).join("");
  const current = characters[cursor] ?? " ";
  const after = characters.slice(cursor + 1).join("");
  return `${before}${paint("accent", current, "7;1")}${after}`;
}

function renderHeader(state: GameState, title = "UNIX KEYBOARD KATAS"): string[] {
  const completed = Math.max(0, Math.min(state.completed, challenges.length));
  const progress = progressBar(completed, challenges.length, 14);
  const drillLabel = state.finished
    ? "ALL DRILLS CLEARED"
    : `DRILL ${String(state.challengeIndex + 1).padStart(2, "0")} / ${String(challenges.length).padStart(2, "0")}`;

  const percent = Math.round((completed / challenges.length) * 100);
  return [
    headerLine(alignColumns(`  ${title}`, `  ${drillLabel}`)),
    alignColumns(
      `  ${paint("muted", "TYPEGOD  ·  TERMINAL PRACTICE", "2")}`,
      `${paint("accent", progress.filled, "1")}${paint("dim", progress.empty, "2")}  ${paint("muted", `${percent}%`, "2")}`,
    ),
  ];
}

function renderStatsStrip(state: GameState, elapsed: string): string {
  const lastScore = state.lastScore === null ? "n/a" : `+${state.lastScore}`;
  const content = [
    `TIME ${elapsed}`,
    `KEYS ${state.keyCount}`,
    `MISSES ${state.mistakes}`,
    `SCORE ${state.totalScore}`,
    `LAST ${lastScore}`,
  ].join("   ·   ");

  return backgroundLine(`  ${content}`);
}

function renderControls(): string {
  return `${paint("success", "ENTER", "1")} submit   ${paint("warning", "ESC", "1")} reset   ${paint("error", "CTRL+C", "1")} quit`;
}

function panel(title: string, contents: string[]): string[] {
  const titleText = `─ ${title} `;
  const fill = Math.max(1, PANEL_WIDTH - 2 - visibleLength(titleText));
  const top = `${border("╭")}${paint("accent", titleText, "1")}${border("─".repeat(fill))}${border("╮")}`;
  const bottom = `${border("╰")}${border("─".repeat(PANEL_WIDTH - 2))}${border("╯")}`;

  return [top, ...contents.map(panelRow), bottom];
}

function panelRow(content: string): string {
  const padding = Math.max(0, PANEL_CONTENT_WIDTH - visibleLength(content));
  return `${border("│")} ${content}${" ".repeat(padding)} ${border("│")}`;
}

function backgroundLine(content: string): string {
  const theme = themeManager.current();
  const padding = Math.max(0, PANEL_WIDTH - visibleLength(content));
  return paintRaw(`${theme.colors.text};${theme.panelBackground}`, `${content}${" ".repeat(padding)}`);
}

function headerLine(content: string): string {
  const theme = themeManager.current();
  const padding = Math.max(0, PANEL_WIDTH - visibleLength(content));
  return paintRaw(
    `1;${theme.headerText};${theme.headerBackground}`,
    `${content}${" ".repeat(padding)}`,
  );
}

function border(value: string): string {
  return paint("border", value, "2");
}

function formatTarget(target: string): string {
  return target.length === 0 ? "· empty line" : target;
}

function targetMarker(target: string, cursor: number): string {
  const offset = Math.min(cursor, Array.from(target).length);
  return `${" ".repeat(offset)}^ target cursor`;
}

function progressBar(completed: number, total: number, width: number): { filled: string; empty: string } {
  if (total <= 0) {
    return { filled: "", empty: "░".repeat(width) };
  }

  const filledCount = Math.round((completed / total) * width);
  return {
    filled: "█".repeat(filledCount),
    empty: "░".repeat(Math.max(0, width - filledCount)),
  };
}

function alignColumns(left: string, right: string): string {
  const spaces = Math.max(1, PANEL_WIDTH - visibleLength(left) - visibleLength(right));
  return `${left}${" ".repeat(spaces)}${right}`;
}

function wrapText(value: string, width: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) {
      current = word;
      continue;
    }

    if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function visibleLength(value: string): number {
  return Array.from(value.replace(ANSI_SEQUENCE, "")).length;
}

function paint(role: ThemeColor, value: string, attributes = ""): string {
  const theme = themeManager.current();
  const code = attributes.length > 0 ? `${attributes};${theme.colors[role]}` : theme.colors[role];
  return paintRaw(code, value);
}

function paintRaw(code: string, value: string): string {
  return `${ESC}${code}m${value}${RESET}`;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
