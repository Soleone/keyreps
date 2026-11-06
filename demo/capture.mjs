#!/usr/bin/env node
// Records the browser demo (demo/browser) as the README loop, and the hero from its last frame:
// three drills solved with real key presses, the third with a detour so the score turns yellow.
// Usage: npm run media:capture. Needs agent-browser (with its browser installed) and FFmpeg on the PATH.
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import { record } from "@soleone/showcase-capture";

const exec = promisify(execFile);
const media = path.resolve("demo/media");
const viewport = { width: 1280, height: 820 };
// The game, which fills the left of the terminal: header to score line.
const crop = "iw*700/1280:ih*490/820:iw*80/1280:ih*190/820";
const shows = (text) => `window.terminalText().includes(${JSON.stringify(text)})`;

await exec("npm", ["run", "build"]);
const out = await mkdtemp(path.join(os.tmpdir(), "keyreps-demo-"));
const port = String(4400 + (process.pid % 500));
const server = spawn("node_modules/.bin/showcase", ["terminal", "demo/browser", "--out", path.join(out, "browser"), "--serve", "--port", port], {
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((resolve, reject) => {
  createInterface({ input: server.stdout }).on("line", (line) => line.startsWith("Serving at") && resolve());
  server.once("exit", (code) => reject(new Error(`showcase terminal exited with status ${code}`)));
});

// Key presses at a human pace, so the loop can be followed.
async function keys(page, ...presses) {
  for (const press of presses) {
    await page.run("press", press);
    await page.sleep(140);
  }
}
const typed = (text) => [...text].map((char) => (char === " " ? "Space" : char));

const shot = path.join(out, "last.png");
try {
  const { frames, durationMs, grid } = await record({
    url: `http://127.0.0.1:${port}/`,
    out: path.join(media, "demo.webp"),
    viewport,
    width: 700,
    crop,
    attempts: 3,
    async start(page) {
      await page.waitFor("window.demoReady === true", { timeoutMs: 120_000 });
      // The recipe starts the game by itself.
      await page.waitFor(shows("01 · Get to the start"), { timeoutMs: 60_000 });
      await page.run("eval", "document.querySelector('.xterm-helper-textarea').focus()");
      await page.sleep(1000);
    },
    async drive(page) {
      await page.sleep(1500);
      await keys(page, "Control+a", ...typed("sudo "));
      await page.sleep(600);
      await keys(page, "Enter");
      await page.waitFor(shows("02 · Prefix another command"), { timeoutMs: 10_000 });
      await page.sleep(1800);
      await keys(page, "Control+a", ...typed("env APP_ENV=test "));
      await page.sleep(600);
      await keys(page, "Enter");
      await page.waitFor(shows("03 · Get to the end"), { timeoutMs: 10_000 });
      await page.sleep(1800);
      // A detour: two steps right before remembering Ctrl+E.
      await keys(page, "ArrowRight", "ArrowRight");
      await page.sleep(500);
      await keys(page, "Control+e", ...typed(" --short"));
      await page.sleep(600);
      await keys(page, "Enter");
      await page.waitFor(shows("04 · "), { timeoutMs: 10_000 });
      await page.sleep(2500);
      await page.run("screenshot", shot);
    },
  });
  await exec("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", shot, "-vf", `crop=${crop}`, path.join(media, "hero.png")]);
  console.log(`Wrote demo/media/demo.webp (${frames} frames, ${(durationMs / 1000).toFixed(1)} s) and demo/media/hero.png. Check the frames in ${grid}.`);
} finally {
  server.kill();
  await rm(out, { recursive: true, force: true });
}
