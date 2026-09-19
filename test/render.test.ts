import test from "node:test";
import assert from "node:assert/strict";
import { handleKey, startGame } from "../src/game.js";
import { renderGame } from "../src/render.js";
import type { Key } from "../src/types.js";

const control = (key: string): Key => ({ type: "control", key });
const text = (value: string): Key => ({ type: "text", value });
const enter: Key = { type: "enter" };
const ANSI_SEQUENCE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

function plainRender(state: ReturnType<typeof startGame>): string {
  return renderGame(state).replace(ANSI_SEQUENCE, "");
}

function press(state: ReturnType<typeof startGame>, key: Key) {
  return handleKey(state, key).state;
}

test("renders each current stage instruction as a bullet", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  state = press(state, enter);
  state = press(state, control("e"));
  state = press(state, text(" --short"));
  state = press(state, enter);

  const output = plainRender(state);

  assert.match(output, /• Move left once\./);
  assert.match(output, /• Insert `t`\./);
});

test("makes the editor a focused input before the goal", () => {
  const output = plainRender(startGame());

  assert.match(output, /Typegod · UNIX KEYBOARD KATAS/);
  assert.match(output, /01 · Line start/);
  assert.doesNotMatch(output, /╭─ 01 · Line start/);
  assert.match(output, /╭─/);
  assert.doesNotMatch(output, /INPUT/);
  assert.ok(output.indexOf("INPUT") < output.indexOf("GOAL"));
});

test("aligns the input and goal command", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  const lines = plainRender(state).split("\n");
  const inputLine = lines.findIndex((line) => line.includes("╭─"));
  const inputValueLine = lines.findIndex((line) => line.includes("$ sudo systemctl restart api"));
  const targetLine = lines.find((line) => line.includes("$ sudo systemctl"));
  const markerLine = lines.find((line) => line.includes("cursor"));

  assert.ok(inputLine >= 0);
  assert.ok(inputValueLine >= 0);
  assert.match(lines[inputValueLine] ?? "", /\$ sudo systemctl restart api/);
  assert.doesNotMatch(lines.join("\n"), /HINT|Ctrl\+A jumps/);
  assert.ok(targetLine !== undefined);
  assert.ok(markerLine !== undefined);
  assert.equal(lines[inputValueLine]?.indexOf("sudo"), targetLine?.indexOf("sudo"));
  assert.equal(markerLine?.indexOf("^"), targetLine?.indexOf("sudo") + 4);
  assert.doesNotMatch(markerLine ?? "", /target cursor/);
});

test("puts status below the goal as one line", () => {
  const state = press(startGame(), control("a"));
  const lines = plainRender(state).split("\n");
  const goalIndex = lines.findIndex((line) => line.includes("GOAL"));
  const statusIndex = lines.findIndex((line) => line.includes("STATUS"));

  assert.equal(statusIndex, goalIndex + 4);
  assert.equal(lines[statusIndex - 1]?.trim(), "");
  assert.doesNotMatch(lines[statusIndex] ?? "", /\n/);
});

test("shows keyboard presses instead of an abstract score", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  state = press(state, enter);

  const output = plainRender(state);

  assert.match(output, /Solved\. 6 key presses\. Perfect\./);
  assert.match(output, /KEYS 0 · MISSES 0 · TOTAL 6/);
  assert.doesNotMatch(output, /SCORE|points|FINAL SCORE/);
});

test("shows the final keyboard press total", () => {
  const state = {
    ...startGame(),
    finished: true,
    completed: 13,
    totalKeys: 46,
    keyCount: 1,
    lastKeyCount: 1,
    lastPerformance: "perfect" as const,
  };

  const output = plainRender(state);

  assert.match(output, /KEY PRESSES\s+46/);
  assert.match(output, /LAST DRILL\s+1 key press · Perfect/);
  assert.doesNotMatch(output, /SCORE|points|FINAL SCORE/);
});
