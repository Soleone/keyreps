import { challenges } from "./challenges.js";
import { currentChallenge, keyPerformance, type GameState, type KeyPerformance } from "./game.js";
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
    return `${CLEAR_SCREEN}${paint("error", "No challenge loaded.", "1")}\n`;
  }

  const drillName = formatDrillName(challenge.id);
  const drillLabel = `${String(state.challengeIndex + 1).padStart(2, "0")} · ${drillName}`;
  const challengeHeading = alignColumns(
    `  ${paint("accent", drillLabel, "1")}`,
    `  ${renderProgressLabel(state)}`,
  );
  const challengeContent = [
    challengeHeading,
    "",
    `  ${paint("text", challenge.title, "1")}`,
    ...renderInstructionList(challenge.instructions),
    "",
    `  ${paint("accent", challenge.focusLabel, "1")} ${paint("muted", `· ${challenge.focusDescription}`, "2")}`,
    "",
    ...renderEditorBlock(state.editor),
    "",
    paint("info", "GOAL", "2"),
    `  ${paint("dim", `$ ${formatTarget(challenge.target)}`, "2")}`,
    `  ${targetMarker(challenge.target, challenge.targetCursor)}`,
    ...(state.message.length > 0 ? ["", renderStatus(state.message, state.lastPerformance)] : []),
  ];

  const lines = [
    ...renderHeader(state),
    "",
    ...challengeContent,
    "",
    renderStatsStrip(state),
    "",
    renderControls(),
  ];

  return `${CLEAR_SCREEN}${lines.join("\n")}\n`;
}

function renderFinished(state: GameState): string {
  const idealTotal = challenges.reduce((total, challenge) => total + challenge.idealKeys, 0);
  const totalPerformance = keyPerformance(state.totalKeys, idealTotal);
  const result = [
    `  ${paint("success", "All keyboard drills cleared.", "1")}`,
    "",
    `  ${paint("muted", "DRILLS COMPLETED", "2")}  ${paint("text", `${state.completed} / ${challenges.length}`, "1")}`,
    `  ${paint("muted", "KEY PRESSES", "2")}       ${paint(performanceColor(totalPerformance), `${state.totalKeys} · ${performanceLabel(totalPerformance)}`, "1")}`,
    state.lastKeyCount === null
      ? ""
      : `  ${paint("muted", "LAST DRILL", "2")}          ${paint(performanceColor(state.lastPerformance), `${state.lastKeyCount} ${keyPressLabel(state.lastKeyCount)} · ${performanceLabel(state.lastPerformance)}`, "1")}`,
  ];

  const lines = [
    ...renderHeader(state, "UNIX KEYBOARD KATAS  /  COMPLETE", true),
    "",
    ...panel(iconLabel(icons.complete, "RUN COMPLETE"), result),
    "",
    renderStatsStrip(state),
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

function renderHeader(state: GameState, title = "UNIX KEYBOARD KATAS", includeProgress = false): string[] {
  const drillLabel = state.finished
    ? "ALL DRILLS CLEARED"
    : `DRILL ${String(state.challengeIndex + 1).padStart(2, "0")} / ${String(challenges.length).padStart(2, "0")}`;
  const lines = [headerLine(alignColumns(`  Typegod · ${title}`, `  ${drillLabel}`))];

  if (includeProgress) {
    lines.push(alignColumns("", `  ${renderProgressLabel(state)}`));
  }

  return lines;
}

function renderProgressLabel(state: GameState): string {
  const completed = Math.max(0, Math.min(state.completed, challenges.length));
  const progress = progressBar(completed, challenges.length, 14);
  const percent = Math.round((completed / challenges.length) * 100);
  return `${paint("accent", progress.filled, "1")}${paint("dim", progress.empty, "2")}  ${paint("muted", `${percent}%`, "2")}`;
}

function renderStatsStrip(state: GameState): string {
  const content = [
    `KEYS ${state.keyCount}`,
    `MISSES ${state.mistakes}`,
    `TOTAL ${state.totalKeys}`,
  ].join(" · ");

  return backgroundLine(`  ${content}`);
}

function renderControls(): string {
  return `${paint("success", iconLabel(icons.submit, "ENTER"), "1")} submit   ${paint("warning", iconLabel(icons.reset, "ESC"), "1")} reset   ${paint("error", iconLabel(icons.quit, "CTRL+C"), "1")} quit`;
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

function renderStatus(message: string, performance: KeyPerformance | null): string {
  const prefix = "STATUS · ";
  const available = PANEL_CONTENT_WIDTH - 2 - prefix.length;
  return `  ${paint("warning", "STATUS", "1")} ${paint("dim", "·", "2")} ${paint(performanceColor(performance), truncateSingleLine(message, available), "1")}`;
}

function truncateSingleLine(value: string, width: number): string {
  const characters = Array.from(value);
  if (characters.length <= width) {
    return value;
  }

  return `${characters.slice(0, Math.max(0, width - 1)).join("")}…`;
}

function targetMarker(target: string, cursor: number): string {
  const targetLength = Array.from(target).length;
  const offset = Math.max(0, Math.min(cursor, targetLength));
  const markerOffset = offset > 0 && offset < targetLength ? offset - 1 : offset;
  const marker = icons.goal.length > 0
    ? iconLabel(icons.goal, "cursor")
    : "^ cursor";
  return `  ${" ".repeat(markerOffset)}${paint("dim", marker, "2")}`;
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

function renderInstructionList(instructions: string[]): string[] {
  return instructions.flatMap((instruction) =>
    wrapText(instruction, PANEL_CONTENT_WIDTH - 4).map((line, index) =>
      `${index === 0 ? `  ${paint("accent", "•", "1")} ` : "    "}${line}`,
    ),
  );
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
