import { StringDecoder } from "node:string_decoder";
import type { Key } from "./types.js";

const ESC = "\u001b";

type Parsed = { key: Key; length: number } | null;

/**
 * Turns raw terminal bytes into semantic key events.
 *
 * Escape sequences can arrive split across stdin chunks, so incomplete
 * sequences stay buffered until the next call to feed().
 */
export class InputDecoder {
  private readonly utf8 = new StringDecoder("utf8");
  private buffer = "";

  feed(chunk: Buffer | string): Key[] {
    this.buffer += typeof chunk === "string" ? chunk : this.utf8.write(chunk);
    return this.parse();
  }

  flush(): Key[] {
    this.buffer += this.utf8.end();
    return this.flushPending();
  }

  hasPending(): boolean {
    return this.buffer.length > 0;
  }

  flushPending(): Key[] {
    if (this.buffer.startsWith(ESC)) {
      this.buffer = this.buffer.slice(1);
      return [{ type: "escape" }, ...this.parse()];
    }
    return this.parse();
  }

  private parse(): Key[] {
    const keys: Key[] = [];

    while (this.buffer.length > 0) {
      const parsed = this.parseOne();
      if (parsed === null) {
        break;
      }

      keys.push(parsed.key);
      this.buffer = this.buffer.slice(parsed.length);
    }

    return keys;
  }

  private parseOne(): Parsed {
    const first = this.buffer[0];
    if (first === undefined) {
      return null;
    }

    if (first !== ESC) {
      return this.parseOrdinaryCharacter();
    }

    if (this.buffer.length === 1) {
      return null;
    }

    const second = this.buffer[1];
    if (second === "[") {
      return this.parseCsi();
    }
    if (second === "O") {
      return this.parseSs3();
    }

    const altCharacter = Array.from(this.buffer.slice(1))[0];
    if (altCharacter === undefined) {
      return null;
    }

    if (/^[a-zA-Z]$/.test(altCharacter)) {
      return {
        key: { type: "alt", key: altCharacter.toLowerCase() },
        length: 1 + altCharacter.length,
      };
    }

    return { key: { type: "escape" }, length: 1 };
  }

  private parseOrdinaryCharacter(): Parsed {
    const code = this.buffer.charCodeAt(0);

    if (code === 0x7f || code === 0x08) {
      return { key: { type: "backspace" }, length: 1 };
    }
    if (code === 0x0d || code === 0x0a) {
      return { key: { type: "enter" }, length: 1 };
    }
    if (code === 0x09) {
      return { key: { type: "tab" }, length: 1 };
    }
    if (code >= 0x01 && code <= 0x1a) {
      return {
        key: { type: "control", key: String.fromCharCode(code + 0x60) },
        length: 1,
      };
    }

    const character = Array.from(this.buffer)[0];
    if (character === undefined) {
      return null;
    }

    if (code < 0x20) {
      return {
        key: { type: "unknown", value: this.buffer[0] ?? "" },
        length: 1,
      };
    }

    return { key: { type: "text", value: character }, length: character.length };
  }

  private parseCsi(): Parsed {
    const match = this.buffer.match(/^\u001b\[([0-9;?]*)([A-Za-z~])/);
    if (match === null) {
      return null;
    }

    const sequence = match[0];
    const final = match[2];
    if (final === undefined) {
      return null;
    }

    const key = csiKey(sequence);
    if (key !== null) {
      return { key, length: sequence.length };
    }

    // Unknown CSI sequence. Treat the escape itself as Escape and let the
    // remaining bytes be parsed normally rather than swallowing user input.
    return { key: { type: "escape" }, length: 1 };
  }

  private parseSs3(): Parsed {
    if (this.buffer.length < 3) {
      return null;
    }

    const sequence = this.buffer.slice(0, 3);
    const key = ss3Key(sequence);
    if (key !== null) {
      return { key, length: 3 };
    }

    return { key: { type: "escape" }, length: 1 };
  }
}

function csiKey(sequence: string): Key | null {
  switch (sequence) {
    case `${ESC}[A`:
    case `${ESC}[B`:
      return { type: "unknown", value: sequence };
    case `${ESC}[C`:
      return { type: "move", direction: "right", by: "char" };
    case `${ESC}[D`:
      return { type: "move", direction: "left", by: "char" };
    case `${ESC}[H`:
      return { type: "home" };
    case `${ESC}[F`:
      return { type: "end" };
    case `${ESC}[1~`:
    case `${ESC}[7~`:
      return { type: "home" };
    case `${ESC}[4~`:
    case `${ESC}[8~`:
      return { type: "end" };
    case `${ESC}[3~`:
      return { type: "delete" };
    case `${ESC}[1;5D`:
    case `${ESC}[5D`:
    case `${ESC}[1;3D`:
    case `${ESC}[3D`:
    case `${ESC}[1;6D`:
    case `${ESC}[6D`:
      return { type: "move", direction: "left", by: "word" };
    case `${ESC}[1;5C`:
    case `${ESC}[5C`:
    case `${ESC}[1;3C`:
    case `${ESC}[3C`:
    case `${ESC}[1;6C`:
    case `${ESC}[6C`:
      return { type: "move", direction: "right", by: "word" };
    default:
      return null;
  }
}

function ss3Key(sequence: string): Key | null {
  switch (sequence) {
    case `${ESC}OA`:
    case `${ESC}OB`:
      return { type: "unknown", value: sequence };
    case `${ESC}OC`:
      return { type: "move", direction: "right", by: "char" };
    case `${ESC}OD`:
      return { type: "move", direction: "left", by: "char" };
    case `${ESC}OH`:
      return { type: "home" };
    case `${ESC}OF`:
      return { type: "end" };
    default:
      return null;
  }
}
