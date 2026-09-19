import test from "node:test";
import assert from "node:assert/strict";
import { InputDecoder } from "../src/input.js";

void test("decodes control characters", () => {
  const decoder = new InputDecoder();
  const keys = decoder.feed(Buffer.from([0x01, 0x05, 0x15, 0x0b, 0x17]));

  assert.deepEqual(keys, [
    { type: "control", key: "a" },
    { type: "control", key: "e" },
    { type: "control", key: "u" },
    { type: "control", key: "k" },
    { type: "control", key: "w" },
  ]);
});

void test("decodes split arrow escape sequences", () => {
  const decoder = new InputDecoder();

  assert.deepEqual(decoder.feed("\u001b[1;5"), []);
  assert.deepEqual(decoder.feed("C"), [
    { type: "move", direction: "right", by: "word" },
  ]);
});

test("flushes a bare Escape without swallowing a later key", () => {
  const decoder = new InputDecoder();

  assert.deepEqual(decoder.feed("\u001b"), []);
  assert.deepEqual(decoder.flushPending(), [{ type: "escape" }]);
  assert.deepEqual(decoder.feed("x"), [{ type: "text", value: "x" }]);
});

test("does not mistake up and down arrows for horizontal movement", () => {
  const decoder = new InputDecoder();

  assert.deepEqual(decoder.feed("\u001b[A\u001b[B"), [
    { type: "unknown", value: "\u001b[A" },
    { type: "unknown", value: "\u001b[B" },
  ]);
});

void test("accepts Alt+B and Ctrl+Left as word-left", () => {
  const decoder = new InputDecoder();

  assert.deepEqual(decoder.feed("\u001bb\u001b[1;5D"), [
    { type: "alt", key: "b" },
    { type: "move", direction: "left", by: "word" },
  ]);
});

void test("decodes home, end, delete, and enter", () => {
  const decoder = new InputDecoder();
  const keys = decoder.feed("\u001b[H\u001b[F\u001b[3~\r");

  assert.deepEqual(keys, [
    { type: "home" },
    { type: "end" },
    { type: "delete" },
    { type: "enter" },
  ]);
});

test("decodes PageUp and PageDown", () => {
  const decoder = new InputDecoder();

  assert.deepEqual(decoder.feed("\u001b[5~\u001b[6~"), [
    { type: "page", direction: "up" },
    { type: "page", direction: "down" },
  ]);
});
