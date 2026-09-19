import { spawnSync } from "node:child_process";

export interface TerminalIcons {
  readonly nerdFont: boolean;
  readonly keyboard: string;
  readonly key: string;
  readonly target: string;
  readonly goal: string;
  readonly terminal: string;
  readonly hint: string;
  readonly complete: string;
  readonly submit: string;
  readonly reset: string;
  readonly quit: string;
}

const textIcons: TerminalIcons = {
  nerdFont: false,
  keyboard: "",
  key: "",
  target: "",
  goal: "",
  terminal: "",
  hint: "",
  complete: "",
  submit: "",
  reset: "",
  quit: "",
};

// These are Font Awesome glyphs included by Nerd Fonts. Keep the set small so
// icons act as landmarks instead of turning every label into decoration.
const nerdFontIcons: TerminalIcons = {
  nerdFont: true,
  keyboard: "\uf11c",
  key: "\uf084",
  target: "\uf140",
  goal: "\uf062",
  terminal: "\uf120",
  hint: "\uf0eb",
  complete: "\uf091",
  submit: "\uf00c",
  reset: "\uf021",
  quit: "\uf08b",
};

type IconPreference = "auto" | "nerd" | "text";

/**
 * Select the small decorative icon set used by the renderer.
 *
 * Font availability cannot be queried through a terminal protocol. In auto
 * mode, we use fontconfig when the app is attached to a TTY and otherwise keep
 * rendering deterministic text-only output. TYPEGOD_ICONS can force either
 * mode for terminals where fontconfig does not reflect the active font.
 */
export function createTerminalIcons(
  env: NodeJS.ProcessEnv = process.env,
  isTTY = process.stdout.isTTY === true,
): TerminalIcons {
  const preference = parsePreference(env.TYPEGOD_ICONS);
  if (preference === "text") {
    return textIcons;
  }
  if (preference === "nerd") {
    return nerdFontIcons;
  }

  return isTTY && hasNerdFont() ? nerdFontIcons : textIcons;
}

export function iconLabel(icon: string, label: string): string {
  return icon.length > 0 ? `${icon} ${label}` : label;
}

function parsePreference(value: string | undefined): IconPreference {
  switch (value?.trim().toLowerCase()) {
    case "nerd":
    case "nerdfont":
    case "nerd-font":
    case "1":
    case "true":
      return "nerd";
    case "text":
    case "ascii":
    case "off":
    case "0":
    case "false":
      return "text";
    default:
      return "auto";
  }
}

function hasNerdFont(): boolean {
  try {
    const result = spawnSync("fc-list", [":", "family"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 250,
    });
    const families = typeof result.stdout === "string" ? result.stdout : "";
    return result.status === 0 && /nerd\s*font|\bnf\b/i.test(families);
  } catch {
    return false;
  }
}
