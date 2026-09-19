import test from "node:test";
import assert from "node:assert/strict";
import { applyKey, createEditor } from "../src/editor.js";
import type { Key } from "../src/types.js";

function run(text: string, cursor: number, keys: Key[]) {
  let state = createEditor(text, cursor);
  for (const key of keys) {
    state = applyKey(state, key).state;
  }
  return state;
}

const control = (key: string): Key => ({ type: "control", key });
const alt = (key: string): Key => ({ type: "alt", key });
const text = (value: string): Key => ({ type: "text", value });

void test("Ctrl+A and Ctrl+E move to line boundaries", () => {
  const atStart = run("hello world", 7, [control("a")]);
  const atEnd = run("hello world", 0, [control("e")]);

  assert.equal(atStart.cursor, 0);
  assert.equal(atEnd.cursor, 11);
});

void test("word movement uses whitespace boundaries", () => {
  const left = run("git checkout main", 17, [alt("b")]);
  const right = run("git checkout main", 0, [alt("f"), alt("f"), alt("f")]);

  assert.equal(left.cursor, 13);
  assert.equal(right.cursor, 17);
});

void test("kill and yank operations preserve the kill ring", () => {
  const state = run("git status --short", 11, [control("k"), control("y")]);

  assert.equal(state.text, "git status --short");
  assert.equal(state.cursor, 18);
  assert.equal(state.killRing, "--short");
});

void test("word kills remove the expected word and separator", () => {
  const previous = run("git commit message", 18, [control("w")]);
  const next = run("git commit message", 4, [alt("d")]);

  assert.equal(previous.text, "git commit");
  assert.equal(previous.cursor, 10);
  assert.equal(next.text, "git message");
  assert.equal(next.cursor, 4);
});

void test("transpose and delete repair a command", () => {
  const transposed = run("git stauts", 8, [control("t")]);
  const deleted = run("git sttatus", 6, [control("d")]);

  assert.equal(transposed.text, "git status");
  assert.equal(transposed.cursor, 9);
  assert.equal(deleted.text, "git status");
  assert.equal(deleted.cursor, 6);
});

void test("text insertion handles Unicode code points", () => {
  const state = run("café", 4, [text(" 🚀")]);

  assert.equal(state.text, "café 🚀");
  assert.equal(state.cursor, 6);
});
