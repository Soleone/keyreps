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
  "line-start-prefix": [control("a"), text("env APP_ENV=test ")],
  "line-end-redirect": [control("e"), text(" 2>&1")],
  "char-left-missing-letter": [control("b"), text("n")],
  "char-right-missing-letter": [control("f"), text("c")],
  "word-left-option": [alt("b"), text("--dry-run ")],
  "word-right-option": [alt("f"), text(" --rm")],
  "kill-to-end-options": [control("k")],
  "kill-to-start-prefix": [control("u")],
  "kill-previous-option": [control("w")],
  "kill-next-prefix": [alt("d")],
  "yank-command": [control("u"), control("y")],
  "transpose-at-end": [control("t")],
  "delete-option-character": [control("d")],
  "combo-prefix-and-append": [control("a"), text("sudo "), control("e"), text(" --branch")],
  "combo-remove-and-append": [alt("b"), alt("b"), alt("d"), control("e"), text(" --detach")],
  "combo-restore-and-trim": [control("u"), text("sudo "), control("y"), control("w")],
  "combo-repair-and-replace": [control("t"), control("e"), control("w"), text(" --verbose")],
  "combo-prefix-and-insert-option": [control("a"), text("sudo "), alt("f"), alt("f"), text(" --dry-run")],
  "combo-strip-options-and-rebuild": [control("u"), control("e"), control("w"), control("w"), text(" --message release")],
  "expert-release-command": [control("w"), control("w"), control("a"), text("sudo "), control("e"), text(" --message release --no-verify")],
  "expert-compose-file": [control("w"), control("w"), alt("b"), text("-f compose.prod.yml "), control("e"), text(" --wait")],
  "expert-repair-deploy": [control("w"), control("w"), text(" production.yaml"), alt("b"), alt("b"), text("--server-side "), control("e")],
  "expert-test-command": [control("w"), control("y"), control("a"), text("env NODE_ENV=production "), control("e"), text(" --reporter=spec")],
  "expert-service-options": [control("a"), alt("d"), alt("f"), alt("f"), text(" --force")],
  "expert-reorder-diff": [alt("b"), alt("b"), alt("d"), control("e"), text(" --word-diff")],
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

test("core shortcuts are practiced in different scenarios", () => {
  const repeatedFocuses = [
    "line-start",
    "line-end",
    "move-char-left",
    "move-char-right",
    "move-word-left",
    "move-word-right",
    "kill-to-end",
    "kill-to-start",
    "kill-previous-word",
    "kill-next-word",
    "yank",
    "transpose",
    "delete-next-char",
  ] as const;

  for (const focus of repeatedFocuses) {
    const scenarios = challenges.filter((challenge) => challenge.focus === focus);
    assert.ok(scenarios.length >= 2, `${focus} needs multiple scenarios`);
    assert.equal(new Set(scenarios.map((scenario) => scenario.start)).size, scenarios.length);
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
