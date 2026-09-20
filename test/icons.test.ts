import test from "node:test";
import assert from "node:assert/strict";
import { createTerminalIcons, iconLabel } from "../src/icons.js";

test("text mode keeps the existing text-only layout", () => {
  const icons = createTerminalIcons({ KEYREPS_ICONS: "text" }, true);

  assert.equal(icons.nerdFont, false);
  assert.equal(icons.keyboard, "");
  assert.equal(iconLabel(icons.keyboard, "GUIDANCE"), "GUIDANCE");
});

test("Nerd Font mode exposes the restrained landmark set", () => {
  const icons = createTerminalIcons({ KEYREPS_ICONS: "nerdfont" }, false);

  assert.equal(icons.nerdFont, true);
  assert.notEqual(icons.keyboard, "");
  assert.equal(icons.goal, "\uf062");
  assert.equal(iconLabel(icons.hint, "GUIDANCE").endsWith("GUIDANCE"), true);
});
