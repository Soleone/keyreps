import test from "node:test";
import assert from "node:assert/strict";
import { handleKey, keyPerformance, startGame } from "../src/game.js";
import { challenges } from "../src/challenges.js";
import type { Key } from "../src/types.js";

const control = (key: string): Key => ({ type: "control", key });
const alt = (key: string): Key => ({ type: "alt", key });
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
  assert.equal(state.totalKeys, 6);
  assert.equal(state.lastKeyCount, 6);
  assert.equal(state.lastPerformance, "perfect");
  assert.match(state.message, /6 key presses/);
  assert.match(state.message, /Perfect/);
});

test("key performance uses keyboard presses only", () => {
  assert.equal(keyPerformance(6, 6), "perfect");
  assert.equal(keyPerformance(8, 6), "close");
  assert.equal(keyPerformance(9, 6), "poor");
});

const optimalPaths: Record<string, Key[]> = {
  "line-start": [control("a"), text("sudo ")],
  "line-end": [control("e"), text(" --short")],
  "char-left": [control("b"), text("t")],
  "char-right": [control("f"), text("t")],
  "word-left": [alt("b"), text("switch ")],
  "word-right": [alt("f"), text(" --verbose")],
  "kill-to-end": [control("k")],
  "kill-to-start": [control("u")],
  "kill-previous-word": [control("w")],
  "kill-next-word": [alt("d")],
  yank: [control("k"), control("y")],
  transpose: [control("t")],
  "delete-character": [control("d")],
};

test("every lesson's optimal path matches its perfect key count", () => {
  let state = startGame();

  for (const challenge of challenges) {
    const path = optimalPaths[challenge.id];
    assert.ok(path, `Missing optimal path for ${challenge.id}`);

    for (const key of path) {
      state = press(state, key);
    }

    assert.equal(state.keyCount, challenge.idealKeys, challenge.id);
    state = press(state, enter);
    assert.equal(state.lastKeyCount, challenge.idealKeys, challenge.id);
    assert.equal(state.lastPerformance, "perfect", challenge.id);
  }
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
