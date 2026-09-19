import test from "node:test";
import assert from "node:assert/strict";
import { challenges } from "../src/challenges.js";
import { createEditor } from "../src/editor.js";
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

  assert.match(output, /• Move left once/);
  assert.match(output, /• Insert t/);
  assert.ok(output.indexOf("Ctrl+B move left") < output.indexOf("• Move left once"));
  assert.doesNotMatch(output, /`/);
});

test("condenses the lesson heading and guidance", () => {
  const output = plainRender(startGame());

  assert.match(output, /Typegod · Learn to control the unix keyboard\s+01 \/ 38/);
  assert.match(output, /01 · Line start · Get to the start/);
  assert.match(output, /╭─/);
  assert.doesNotMatch(output, /INPUT|DETAILS/);

  const outputLines = output.split("\n");
  const headingLine = outputLines.find((line) => line.includes("01 · Line start"));
  const headingIndex = output.indexOf("01 · Line start");
  const goalIndex = output.indexOf("GOAL");
  const editorIndex = output.indexOf("╭─");
  const focusIndex = output.indexOf("Ctrl+A start of line");
  const guidanceIndex = output.indexOf("• Prefix");
  const scoreIndex = output.indexOf("KEYS  6");

  assert.equal(outputLines[0], "  ");
  assert.equal(headingLine?.startsWith("  01 ·"), true);
  assert.ok(headingIndex < goalIndex);
  assert.ok(goalIndex < editorIndex);
  assert.ok(editorIndex < focusIndex);
  assert.ok(focusIndex < guidanceIndex);
  assert.ok(guidanceIndex < scoreIndex);
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
  assert.match(lines.join("\n"), /Ctrl\+A start of line/);
  assert.doesNotMatch(lines.join("\n"), /TIP|Ctrl\+A jumps/);
  assert.ok(targetLine !== undefined);
  assert.ok(markerLine !== undefined);
  assert.equal(lines[inputValueLine]?.indexOf("sudo"), targetLine?.indexOf("sudo"));
  assert.equal(markerLine?.indexOf("cursor") - 2, targetLine?.indexOf("sudo") + "sudo ".length);
  assert.doesNotMatch(markerLine ?? "", /target cursor/);
});

test("aligns every goal cursor with its target insertion point", () => {
  for (const [challengeIndex, challenge] of challenges.entries()) {
    const state = {
      ...startGame(),
      challengeIndex,
      editor: createEditor(challenge.target, challenge.targetCursor),
    };
    const lines = plainRender(state).split("\n");
    const goalIndex = lines.findIndex((line) => line.includes("GOAL"));
    const targetLine = lines[goalIndex + 1] ?? "";
    const markerLine = lines[goalIndex + 2] ?? "";
    const markerPosition = markerLine.indexOf("cursor") - 2;
    const targetPosition = targetLine.indexOf("$ ") + 2 + challenge.targetCursor;

    assert.equal(markerPosition, targetPosition, challenge.id);
  }
});

test("renders an empty target as a blank command line", () => {
  const challengeIndex = challenges.findIndex((challenge) => challenge.id === "kill-to-start");
  const challenge = challenges[challengeIndex];
  assert.ok(challenge);
  assert.equal(challenge.target, "");

  const state = {
    ...startGame(),
    challengeIndex,
    editor: createEditor(challenge.start, challenge.startCursor),
  };
  const lines = plainRender(state).split("\n");
  const goalIndex = lines.findIndex((line) => line.includes("GOAL"));

  assert.equal(lines[goalIndex + 1], "  $ ");
  assert.match(lines[goalIndex + 2] ?? "", /cursor/);
  assert.doesNotMatch(lines[goalIndex + 1] ?? "", /empty line/);
});

test("shows a completion notification below the controls", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  state = press(state, enter);

  const output = plainRender(state);
  const lines = output.split("\n");
  const controlsIndex = lines.findIndex((line) => line.includes("ENTER submit"));
  const notificationIndex = lines.findIndex((line) => line.includes("Lesson complete"));

  assert.match(output, /✓ Perfect Lesson complete/);
  assert.ok(controlsIndex >= 0);
  assert.equal(notificationIndex - controlsIndex, 3);
  assert.equal(lines[notificationIndex - 1]?.trim(), "");
  assert.equal(lines[notificationIndex - 2]?.trim(), "");
});

test("does not show a completion notification before a lesson is solved", () => {
  const output = plainRender(press(startGame(), control("a")));

  assert.doesNotMatch(output, /Lesson complete/);
});

test("keeps the controls text-only", () => {
  const output = plainRender(startGame());

  assert.match(output, /ENTER submit   ESC reset   CTRL\+C quit/);
  assert.doesNotMatch(output, /||/);
});

test("shows keyboard presses instead of an abstract score", () => {
  let state = startGame();
  state = press(state, control("a"));
  state = press(state, text("sudo "));
  state = press(state, enter);

  const output = plainRender(state);

  assert.match(output, /KEYS  9/);
  assert.doesNotMatch(output, /MISSES|TOTAL/);
  assert.doesNotMatch(output, /SCORE|points|FINAL SCORE/);
});

test("counts the remaining optimal keys down through zero", () => {
  const challenge = challenges[0];
  assert.ok(challenge);

  const initial = plainRender(startGame());
  assert.match(initial, /KEYS  6/);
  assert.doesNotMatch(initial, /MISSES|TOTAL/);

  const atGoal = plainRender({
    ...startGame(),
    keyCount: challenge.idealKeys,
  });
  assert.match(atGoal, /KEYS  0/);
  assert.doesNotMatch(atGoal, /MISSES|TOTAL/);

  const overBudget = plainRender({
    ...startGame(),
    keyCount: challenge.idealKeys + 1,
  });
  assert.match(overBudget, /KEYS -1/);
  assert.doesNotMatch(overBudget, /MISSES|TOTAL/);

  const atGoalLine = atGoal.split("\n").find((line) => line.includes("KEYS  0"));
  const overBudgetLine = overBudget.split("\n").find((line) => line.includes("KEYS -1"));
  assert.equal(atGoalLine?.indexOf("KEYS"), overBudgetLine?.indexOf("KEYS"));
});

test("keeps the stats highlight at the common left padding", () => {
  const line = renderGame(startGame()).split("\n").find((value) => value.includes("KEYS  6"));
  const escape = String.fromCharCode(27);

  assert.equal(line?.startsWith(`  ${escape}[`), true);
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

test("hides expert instructions until a player wastes a key press", () => {
  const expertIndex = challenges.findIndex((challenge) => challenge.tier === "expert");
  const challenge = challenges[expertIndex];
  assert.ok(challenge);

  const initial = {
    ...startGame(),
    challengeIndex: expertIndex,
    editor: createEditor(challenge.start, challenge.startCursor),
  };
  const hidden = plainRender(initial);

  assert.match(hidden, /EXPERT · instructions hidden/);
  assert.doesNotMatch(hidden, /Remove --amend and --no-edit/);

  const wasted = plainRender({
    ...initial,
    keyCount: challenge.idealKeys + 1,
  });

  assert.match(wasted, /Guidance unlocked after a wasted key press/);
  assert.match(wasted, /• Remove --amend and --no-edit/);
});
