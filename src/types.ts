export type Direction = "left" | "right";
export type PageDirection = "up" | "down";

export type Key =
  | { type: "text"; value: string }
  | { type: "control"; key: string }
  | { type: "alt"; key: string }
  | { type: "move"; direction: Direction; by: "char" | "word" }
  | { type: "home" }
  | { type: "end" }
  | { type: "backspace" }
  | { type: "delete" }
  | { type: "enter" }
  | { type: "escape" }
  | { type: "tab" }
  | { type: "page"; direction: PageDirection }
  | { type: "unknown"; value: string };
