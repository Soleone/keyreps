import test from "node:test";
import assert from "node:assert/strict";
import { handleKey, keyPerformance, startGame } from "../src/game.js";
import type { Key } from "../src/types.js";

const control = (key: string): Key => ({ type: "control", key });
const text = (value: string): Key => ({ type: "text", value });
const enter: Key = { type: "enter" };

function press(state: ReturnType<typeof startGame>, key: Key) {
  return handleKey(state, key).state;
}

test("a solved challenge reports the exact keyboard press result", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  state = press(state, enter);

  assert.equal(state.challengeIndex, 1);
  assert.equal(state.completed, 1);
  assert.equal(state.totalKeys, 2);
  assert.equal(state.lastKeyCount, 2);
  assert.equal(state.lastPerformance, "perfect");
  assert.match(state.message, /2 key presses/);
  assert.match(state.message, /Perfect/);
});

test("key performance uses keyboard presses only", () => {
  assert.equal(keyPerformance(2, 2), "perfect");
  assert.equal(keyPerformance(4, 2), "close");
  assert.equal(keyPerformance(5, 2), "poor");
});

test("Ctrl+C requests a clean quit", () => {
  const state = startGame();
  const result = handleKey(state, control("c"));

  assert.equal(result.quit, true);
  assert.equal(result.state, state);
});

test("escape resets a challenge without losing completed key presses", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, { type: "escape" });

  assert.equal(state.challengeIndex, 0);
  assert.equal(state.editor.text, "systemctl restart api");
  assert.equal(state.editor.cursor, "systemctl restart api".length);
  assert.equal(state.keyCount, 0);
  assert.equal(state.totalKeys, 0);
  assert.equal(state.completed, 0);
});
