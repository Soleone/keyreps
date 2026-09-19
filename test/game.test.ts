import test from "node:test";
import assert from "node:assert/strict";
import { handleKey, startGame } from "../src/game.js";
import type { Key } from "../src/types.js";

const control = (key: string): Key => ({ type: "control", key });
const text = (value: string): Key => ({ type: "text", value });
const enter: Key = { type: "enter" };

function press(state: ReturnType<typeof startGame>, key: Key, now = 0) {
  return handleKey(state, key, now).state;
}

test("a solved challenge advances and awards a shortcut bonus", () => {
  let state = startGame(0);
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  state = press(state, enter, 1000);

  assert.equal(state.challengeIndex, 1);
  assert.equal(state.completed, 1);
  assert.equal(state.totalScore, 168);
  assert.match(state.message, /Correct/);
});

test("Ctrl+C requests a clean quit", () => {
  const state = startGame();
  const result = handleKey(state, control("c"));

  assert.equal(result.quit, true);
  assert.equal(result.state, state);
});

test("escape resets a challenge without losing the total score", () => {
  let state = startGame(0);
  state = press(state, control("a"));
  state = press(state, { type: "escape" });

  assert.equal(state.challengeIndex, 0);
  assert.equal(state.editor.text, "systemctl restart api");
  assert.equal(state.editor.cursor, "systemctl restart api".length);
  assert.equal(state.keyCount, 0);
  assert.equal(state.totalScore, 0);
});
