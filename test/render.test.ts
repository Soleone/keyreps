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
  return renderGame(state, 0).replace(ANSI_SEQUENCE, "");
}

function press(state: ReturnType<typeof startGame>, key: Key) {
  return handleKey(state, key, 0).state;
}

test("renders each current stage instruction as a bullet", () => {
  let state = startGame(0);
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
