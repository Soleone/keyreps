import type { Key } from "./types.js";

export type EditorAction =
  | "insert-text"
  | "move-char-left"
  | "move-char-right"
  | "move-word-left"
  | "move-word-right"
  | "line-start"
  | "line-end"
  | "kill-to-start"
  | "kill-to-end"
  | "kill-previous-word"
  | "kill-next-word"
  | "yank"
  | "transpose"
  | "delete-previous-char"
  | "delete-next-char";

export interface EditorState {
  text: string;
  /** Cursor position measured in Unicode code points, not UTF-16 units. */
  cursor: number;
  killRing: string;
}

export interface AppliedKey {
  state: EditorState;
  action: EditorAction | null;
  handled: boolean;
}

export function createEditor(text = "", cursor = codePoints(text).length): EditorState {
  const characters = codePoints(text);
  return {
    text,
    cursor: clamp(cursor, 0, characters.length),
    killRing: "",
  };
}

export function applyKey(editor: EditorState, key: Key): AppliedKey {
  switch (key.type) {
    case "text":
      return {
        state: insert(editor, key.value),
        action: "insert-text",
        handled: true,
      };
    case "move":
      return applyMovement(editor, key.direction, key.by);
    case "home":
      return result({ ...editor, cursor: 0 }, "line-start");
    case "end":
      return result({ ...editor, cursor: codePoints(editor.text).length }, "line-end");
    case "backspace":
      return deletePreviousCharacter(editor);
    case "delete":
      return deleteNextCharacter(editor);
    case "control":
      return applyControl(editor, key.key);
    case "alt":
      return applyAlt(editor, key.key);
    case "enter":
    case "escape":
    case "tab":
    case "unknown":
      return { state: editor, action: null, handled: false };
  }
}

function applyControl(editor: EditorState, key: string): AppliedKey {
  switch (key) {
    case "a":
      return result({ ...editor, cursor: 0 }, "line-start");
    case "e":
      return result({ ...editor, cursor: codePoints(editor.text).length }, "line-end");
    case "b":
      return applyMovement(editor, "left", "char");
    case "f":
      return applyMovement(editor, "right", "char");
    case "u":
      return killToStart(editor);
    case "k":
      return killToEnd(editor);
    case "w":
      return killPreviousWord(editor);
    case "d":
      return deleteNextCharacter(editor);
    case "y":
      return yank(editor);
    case "t":
      return transpose(editor);
    case "h":
      return deletePreviousCharacter(editor);
    default:
      return { state: editor, action: null, handled: false };
  }
}

function applyAlt(editor: EditorState, key: string): AppliedKey {
  switch (key) {
    case "b":
      return applyMovement(editor, "left", "word");
    case "f":
      return applyMovement(editor, "right", "word");
    case "d":
      return killNextWord(editor);
    default:
      return { state: editor, action: null, handled: false };
  }
}

function applyMovement(
  editor: EditorState,
  direction: "left" | "right",
  by: "char" | "word",
): AppliedKey {
  const characters = codePoints(editor.text);
  let cursor = editor.cursor;
  let action: EditorAction;

  if (by === "char") {
    cursor = direction === "left" ? Math.max(0, cursor - 1) : Math.min(characters.length, cursor + 1);
    action = direction === "left" ? "move-char-left" : "move-char-right";
  } else if (direction === "left") {
    cursor = wordLeft(characters, cursor);
    action = "move-word-left";
  } else {
    cursor = wordRight(characters, cursor);
    action = "move-word-right";
  }

  return result({ ...editor, cursor }, action);
}

function killToStart(editor: EditorState): AppliedKey {
  const characters = codePoints(editor.text);
  const killed = characters.slice(0, editor.cursor).join("");
  return result(
    {
      text: characters.slice(editor.cursor).join(""),
      cursor: 0,
      killRing: killed,
    },
    "kill-to-start",
  );
}

function killToEnd(editor: EditorState): AppliedKey {
  const characters = codePoints(editor.text);
  const killed = characters.slice(editor.cursor).join("");
  return result(
    {
      text: characters.slice(0, editor.cursor).join(""),
      cursor: editor.cursor,
      killRing: killed,
    },
    "kill-to-end",
  );
}

function killPreviousWord(editor: EditorState): AppliedKey {
  const characters = codePoints(editor.text);
  let start = wordStart(characters, editor.cursor);
  while (start > 0 && isWhitespace(characters[start - 1])) {
    start -= 1;
  }
  const killed = characters.slice(start, editor.cursor).join("");
  return result(
    {
      text: [...characters.slice(0, start), ...characters.slice(editor.cursor)].join(""),
      cursor: start,
      killRing: killed,
    },
    "kill-previous-word",
  );
}

function killNextWord(editor: EditorState): AppliedKey {
  const characters = codePoints(editor.text);
  let end = wordEnd(characters, editor.cursor);
  while (end < characters.length && isWhitespace(characters[end])) {
    end += 1;
  }
  const killed = characters.slice(editor.cursor, end).join("");
  return result(
    {
      text: [...characters.slice(0, editor.cursor), ...characters.slice(end)].join(""),
      cursor: editor.cursor,
      killRing: killed,
    },
    "kill-next-word",
  );
}

function yank(editor: EditorState): AppliedKey {
  return result(insert(editor, editor.killRing), "yank");
}

function transpose(editor: EditorState): AppliedKey {
  const characters = codePoints(editor.text);
  if (characters.length < 2 || editor.cursor === 0) {
    return result(editor, "transpose");
  }

  const right = editor.cursor >= characters.length ? characters.length - 1 : editor.cursor;
  const left = right - 1;
  if (left < 0) {
    return result(editor, "transpose");
  }

  [characters[left], characters[right]] = [characters[right] as string, characters[left] as string];
  const cursor = editor.cursor >= characters.length ? editor.cursor : editor.cursor + 1;
  return result({ ...editor, text: characters.join(""), cursor }, "transpose");
}

function deletePreviousCharacter(editor: EditorState): AppliedKey {
  if (editor.cursor === 0) {
    return result(editor, "delete-previous-char");
  }

  const characters = codePoints(editor.text);
  characters.splice(editor.cursor - 1, 1);
  return result(
    { ...editor, text: characters.join(""), cursor: editor.cursor - 1 },
    "delete-previous-char",
  );
}

function deleteNextCharacter(editor: EditorState): AppliedKey {
  const characters = codePoints(editor.text);
  if (editor.cursor >= characters.length) {
    return result(editor, "delete-next-char");
  }

  characters.splice(editor.cursor, 1);
  return result({ ...editor, text: characters.join("") }, "delete-next-char");
}

function insert(editor: EditorState, value: string): EditorState {
  if (value.length === 0) {
    return editor;
  }

  const characters = codePoints(editor.text);
  const inserted = codePoints(value);
  characters.splice(editor.cursor, 0, ...inserted);
  return {
    ...editor,
    text: characters.join(""),
    cursor: editor.cursor + inserted.length,
  };
}

function wordStart(characters: string[], cursor: number): number {
  let start = cursor;
  while (start > 0 && isWhitespace(characters[start - 1])) {
    start -= 1;
  }
  while (start > 0 && !isWhitespace(characters[start - 1])) {
    start -= 1;
  }
  return start;
}

function wordEnd(characters: string[], cursor: number): number {
  let end = cursor;
  while (end < characters.length && isWhitespace(characters[end])) {
    end += 1;
  }
  while (end < characters.length && !isWhitespace(characters[end])) {
    end += 1;
  }
  return end;
}

function wordLeft(characters: string[], cursor: number): number {
  return wordStart(characters, cursor);
}

function wordRight(characters: string[], cursor: number): number {
  return wordEnd(characters, cursor);
}

function isWhitespace(value: string | undefined): boolean {
  return value !== undefined && /\s/.test(value);
}

function codePoints(value: string): string[] {
  return Array.from(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function result(state: EditorState, action: EditorAction): AppliedKey {
  return { state, action, handled: true };
}
