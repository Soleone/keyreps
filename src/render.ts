import { challenges, type Challenge } from "./challenges.js";
import {
  currentChallenge,
  keyPerformance,
  shouldShowInstructions,
  type GameState,
  type KeyPerformance,
  type LessonNotification,
} from "./game.js";
import type { EditorState } from "./editor.js";
import { createThemeManager, type ThemeColor } from "./theme.js";
import { createTerminalIcons, iconLabel } from "./icons.js";

const ESC = "\u001b[";
const RESET = `${ESC}0m`;
const CLEAR_SCREEN = `${ESC}2J${ESC}H`;
const PANEL_WIDTH = 76;
const PANEL_CONTENT_WIDTH = PANEL_WIDTH - 4;
const INPUT_WIDTH = PANEL_CONTENT_WIDTH - 2;
const INPUT_CONTENT_WIDTH = INPUT_WIDTH - 4;
const ANSI_SEQUENCE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const LEFT_PADDING = "  ";
const themeManager = createThemeManager();
const icons = createTerminalIcons();

export function refreshTheme(): boolean {
  return themeManager.refresh();
}

export function renderGame(state: GameState): string {
  if (state.finished) {
    return renderFinished(state);
  }

  const challenge = currentChallenge(state);
  if (challenge === undefined) {
    return renderScreen([paint("error", "No challenge loaded.", "1")]);
  }

  const drillName = formatDrillName(challenge.id);
  const drillLabel = `${String(state.challengeIndex + 1).padStart(2, "0")} · ${drillName}`;
  const challengeHeading = alignColumns(
    `${paint("accent", `${drillLabel} ·`, "1")} ${paint("text", challenge.title, "1")}`,
    renderProgressLabel(state),
  );
  const challengeContent = [
    challengeHeading,
    "",
    paint("info", "GOAL", "2"),
    `${paint("dim", "$", "2")} ${paint("text", formatTarget(challenge.target), "2")}`,
    `${targetMarker(challenge.target, challenge.targetCursor)}`,
    "",
    ...renderEditorBlock(state.editor),
    "",
    ...renderChallengeGuidance(state, challenge),
  ];

  const lines = [
    ...renderHeader(state),
    "",
    ...challengeContent,
    "",
    renderStatsStrip(state),
    "",
    renderControls(),
    ...(state.notification === null ? [] : ["", "", renderNotification(state.notification)]),
  ];

  return renderScreen(lines);
}

function renderFinished(state: GameState): string {
  const idealTotal = challenges.reduce((total, challenge) => total + challenge.idealKeys, 0);
  const totalPerformance = keyPerformance(state.totalKeys, idealTotal);
  const result = [
    `${paint("success", "All keyboard drills cleared.", "1")}`,
    "",
    `${paint("text", "DRILLS COMPLETED", "2")}  ${paint("text", `${state.completed} / ${challenges.length}`, "1")}`,
    `${paint("text", "KEY PRESSES", "2")}       ${paint(performanceColor(totalPerformance), `${state.totalKeys} · ${performanceLabel(totalPerformance)}`, "1")}`,
    state.lastKeyCount === null
      ? ""
      : `${paint("text", "LAST DRILL", "2")}          ${paint(performanceColor(state.lastPerformance), `${state.lastKeyCount} ${keyPressLabel(state.lastKeyCount)} · ${performanceLabel(state.lastPerformance)}`, "1")}`,
  ];

  const lines = [
    ...renderHeader(state, "Learn to control the unix keyboard  /  COMPLETE", true),
    "",
    ...panel(iconLabel(icons.complete, "RUN COMPLETE"), result),
    "",
    renderStatsStrip(state),
    "",
    `${paint("accent", "R", "1")} play again   ${paint("text", "CTRL+C", "2")} quit`,
    ...(state.notification === null ? [] : ["", "", renderNotification(state.notification)]),
  ];

  return renderScreen(lines);
}

function renderScreen(lines: string[]): string {
  return `${CLEAR_SCREEN}${["", ...lines].map((line) => `${LEFT_PADDING}${line}`).join("\n")}\n`;
}

export function renderEditorLine(editor: EditorState): string {
  const characters = Array.from(editor.text);
  const cursor = Math.max(0, Math.min(editor.cursor, characters.length));
  const before = characters.slice(0, cursor).join("");
  const current = characters[cursor] ?? " ";
  const after = characters.slice(cursor + 1).join("");
  return `${before}${paint("accent", current, "7;1")}${after}`;
}

function renderHeader(state: GameState, title = "Learn to control the unix keyboard", includeProgress = false): string[] {
  const drillLabel = state.finished
    ? "ALL DRILLS CLEARED"
    : `${String(state.challengeIndex + 1).padStart(2, "0")} / ${String(challenges.length).padStart(2, "0")}`;
  const lines = [headerLine(alignColumns(`Typegod · ${title}`, drillLabel))];

  if (includeProgress) {
    lines.push(alignColumns("", `  ${renderProgressLabel(state)}`));
  }

  return lines;
}

function renderProgressLabel(state: GameState): string {
  const completed = Math.max(0, Math.min(state.completed, challenges.length));
  const progress = progressBar(completed, challenges.length, 14);
  const percent = Math.round((completed / challenges.length) * 100);
  return `${paint("accent", progress.filled, "1")}${paint("dim", progress.empty, "2")}  ${paint("text", `${percent}%`, "2")}`;
}

function renderStatsStrip(state: GameState): string {
  const content = [
    renderKeyStat(state),
    `MISSES ${state.mistakes}`,
    `TOTAL ${state.totalKeys}`,
  ].join(" · ");

  return backgroundLine(content);
}

function renderKeyStat(state: GameState): string {
  const challenge = currentChallenge(state);
  const remainingKeys = challenge === undefined ? 0 : challenge.idealKeys - state.keyCount;
  const performance = challenge !== undefined && state.keyCount >= challenge.idealKeys
    ? keyPerformance(state.keyCount, challenge.idealKeys)
    : null;
  const color = performance === null ? "text" : performanceColor(performance);
  return paint(color, `KEYS ${formatRemainingKeys(remainingKeys)}`, "1");
}

function formatRemainingKeys(value: number): string {
  return value >= 0 ? ` ${value}` : `${value}`;
}

function renderControls(): string {
  return `${paint("success", "ENTER", "1")} ${paint("text", "submit", "2")}   ${paint("warning", "ESC", "1")} ${paint("text", "reset", "2")}   ${paint("error", "CTRL+C", "1")} ${paint("text", "quit", "2")}`;
}

function renderNotification(notification: LessonNotification): string {
  const color = performanceColor(notification.performance);
  const icon = icons.submit.length > 0 ? icons.submit : "✓";
  return `${paint(color, icon, "1")} ${paint(color, performanceLabel(notification.performance), "1")} ${paint("text", notification.text, "2")}`;
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

function formatDrillName(id: string): string {
  const words = id.replaceAll("-", " ").toLowerCase().split(" ");
  const first = words[0] ?? "";
  words[0] = first.length > 0 ? `${first[0]?.toUpperCase() ?? ""}${first.slice(1)}` : first;
  return words.join(" ");
}

function formatTarget(target: string): string {
  return target.length === 0 ? "· empty line" : target;
}

function renderEditorBlock(editor: EditorState): string[] {
  const fill = Math.max(1, INPUT_WIDTH - 2);
  const top = `${inputBorder("╭")}${inputBorder("─".repeat(fill))}${inputBorder("╮")}`;
  const value = `${paint("accent", "$", "1")} ${renderEditorLine(editor)}`;
  const padding = Math.max(0, INPUT_CONTENT_WIDTH - visibleLength(value));
  const row = `${inputBorder("│")} ${value}${" ".repeat(padding)} ${inputBorder("│")}`;
  const bottom = `${inputBorder("╰")}${inputBorder("─".repeat(INPUT_WIDTH - 2))}${inputBorder("╯")}`;
  return [top, row, bottom];
}

function inputBorder(value: string, attributes = "2"): string {
  return paint("accent", value, attributes);
}

function targetMarker(target: string, cursor: number): string {
  const targetLength = Array.from(target).length;
  const offset = Math.max(0, Math.min(cursor, targetLength));
  const marker = icons.goal.length > 0
    ? iconLabel(icons.goal, "cursor")
    : "^ cursor";
  return `  ${" ".repeat(offset)}${paint("dim", marker, "2")}`;
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

function renderChallengeGuidance(state: GameState, challenge: Challenge): string[] {
  const expert = challenge.tier === "expert";
  const revealed = shouldShowInstructions(state, challenge);

  if (expert && !revealed) {
    return [
      paint("text", "EXPERT · instructions hidden", "1"),
      paint("dim", "Solve from memory. Guidance appears after a wasted key press.", "2"),
    ];
  }

  const focus = `${paint("accent", challenge.focusLabel, "1")} ${paint("text", challenge.focusDescription, "2")}`;
  const guidance = [focus, ...renderInstructionList(challenge.instructions)];
  if (expert) {
    guidance.unshift(paint("warning", "Guidance unlocked after a wasted key press.", "2"), "");
  }
  return guidance;
}

function renderInstructionList(instructions: string[]): string[] {
  return instructions.flatMap((instruction) =>
    wrapText(stripTrailingPunctuation(instruction), PANEL_CONTENT_WIDTH - 4).map((line, index) =>
      `${index === 0 ? `${paint("accent", "•", "1")} ` : ""}${line}`,
    ),
  );
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[\p{P}]+$/gu, "");
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

function performanceColor(performance: KeyPerformance | null): ThemeColor {
  switch (performance) {
    case "perfect":
      return "success";
    case "close":
      return "warning";
    case "poor":
      return "error";
    default:
      return "warning";
  }
}

function performanceLabel(performance: KeyPerformance | null): string {
  switch (performance) {
    case "perfect":
      return "Perfect";
    case "close":
      return "Close";
    case "poor":
      return "Too many";
    default:
      return "n/a";
  }
}

function keyPressLabel(count: number): string {
  return count === 1 ? "key press" : "key presses";
}
