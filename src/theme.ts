import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ThemeColor =
  | "accent"
  | "text"
  | "muted"
  | "dim"
  | "border"
  | "warning"
  | "success"
  | "error";

export interface TerminalTheme {
  source: "omarchy" | "ansi";
  colors: Record<ThemeColor, string>;
  panelBackground: string;
}

const fallbackTheme: TerminalTheme = {
  source: "ansi",
  colors: {
    accent: "36",
    text: "37",
    muted: "37",
    dim: "37",
    border: "90",
    warning: "33",
    success: "32",
    error: "31",
  },
  panelBackground: "100",
};

export function loadTerminalTheme(): TerminalTheme {
  const path = findOmarchyColorsFile();
  if (path === undefined) {
    return fallbackTheme;
  }

  try {
    const colors = parseColorsToml(readFileSync(path, "utf8"));
    return {
      source: "omarchy",
      colors: {
        accent: foreground(colors.accent ?? colors.yellow ?? colors.cyan, fallbackTheme.colors.accent),
        text: foreground(colors.foreground ?? colors.bright_foreground, fallbackTheme.colors.text),
        muted: foreground(colors.muted ?? colors.dark_foreground ?? colors.color8, fallbackTheme.colors.muted),
        dim: foreground(colors.dark_foreground ?? colors.muted ?? colors.color8, fallbackTheme.colors.dim),
        border: foreground(colors.border ?? colors.muted ?? colors.color8, fallbackTheme.colors.border),
        warning: foreground(colors.yellow ?? colors.orange ?? colors.accent, fallbackTheme.colors.warning),
        success: foreground(colors.green ?? colors.accent, fallbackTheme.colors.success),
        error: foreground(colors.red ?? colors.accent, fallbackTheme.colors.error),
      },
      panelBackground: background(
        colors.lighter_background ?? colors.background,
        fallbackTheme.panelBackground,
      ),
    };
  } catch {
    return fallbackTheme;
  }
}

function findOmarchyColorsFile(): string | undefined {
  const stateHome = process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state");
  const candidates = [
    process.env.TYPEGOD_THEME_FILE,
    join(stateHome, "omarchy", "current", "theme", "colors.toml"),
    join(homedir(), ".config", "omarchy", "current", "theme", "colors.toml"),
  ];

  return candidates.find((candidate): candidate is string =>
    candidate !== undefined && candidate.length > 0 && existsSync(candidate),
  );
}

function parseColorsToml(value: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const colorPattern = /^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*["']?(#[0-9a-fA-F]{3,6})/;

  for (const line of value.split(/\r?\n/)) {
    const match = colorPattern.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      colors[match[1]] = match[2];
    }
  }

  return colors;
}

function foreground(value: string | undefined, fallback: string): string {
  return value === undefined ? fallback : hexToSgr(value, false) ?? fallback;
}

function background(value: string | undefined, fallback: string): string {
  return value === undefined ? fallback : hexToSgr(value, true) ?? fallback;
}

function hexToSgr(value: string, isBackground: boolean): string | undefined {
  const hex = value.length === 4
    ? value
        .slice(1)
        .split("")
        .map((digit) => `${digit}${digit}`)
        .join("")
    : value.slice(1);

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return undefined;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `${isBackground ? "48" : "38"};2;${red};${green};${blue}`;
}
