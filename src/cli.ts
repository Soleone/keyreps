#!/usr/bin/env node

import process from "node:process";
import { InputDecoder } from "./input.js";
import {
  handleKey,
  startGame,
  type GameState,
  type LessonNotification,
} from "./game.js";
import { refreshTheme, renderGame } from "./render.js";
import type { Key } from "./types.js";

const THEME_POLL_INTERVAL_MS = 750;
const NOTIFICATION_DURATION_MS = 3000;

function main(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("keyreps needs an interactive terminal (TTY).");
    process.exitCode = 1;
    return;
  }

  const decoder = new InputDecoder();
  let game: GameState = startGame();
  let cleanedUp = false;
  let pendingTimer: NodeJS.Timeout | undefined;
  let notificationTimer: NodeJS.Timeout | undefined;
  let themeTimer: NodeJS.Timeout | undefined;

  const cleanup = (): void => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }
    if (notificationTimer !== undefined) {
      clearTimeout(notificationTimer);
      notificationTimer = undefined;
    }
    if (themeTimer !== undefined) {
      clearInterval(themeTimer);
      themeTimer = undefined;
    }
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\u001b[?25h\u001b[0m\n");
  };

  const quit = (code = 0): void => {
    cleanup();
    process.exitCode = code;
  };

  const draw = (): void => {
    process.stdout.write(renderGame(game));
  };

  const scheduleNotificationExpiry = (notification: LessonNotification | null): void => {
    if (notificationTimer !== undefined) {
      clearTimeout(notificationTimer);
      notificationTimer = undefined;
    }
    if (notification === null) {
      return;
    }

    notificationTimer = setTimeout(() => {
      notificationTimer = undefined;
      if (game.notification !== notification) {
        return;
      }
      game = { ...game, notification: null };
      draw();
    }, NOTIFICATION_DURATION_MS);
  };

  const consume = (keys: Key[]): boolean => {
    for (const key of keys) {
      const previousNotification = game.notification;
      const result = handleKey(game, key);
      game = result.state;
      if (game.notification !== previousNotification) {
        scheduleNotificationExpiry(game.notification);
      }
      if (result.quit) {
        quit();
        return false;
      }
    }
    return true;
  };

  const schedulePendingFlush = (): void => {
    if (!decoder.hasPending()) {
      return;
    }

    pendingTimer = setTimeout(() => {
      pendingTimer = undefined;
      if (consume(decoder.flushPending())) {
        draw();
      }
    }, 35);
  };

  const onData = (chunk: Buffer): void => {
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }

    if (!consume(decoder.feed(chunk))) {
      return;
    }

    schedulePendingFlush();
    draw();
  };

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", onData);
  process.once("SIGINT", () => quit());
  process.once("SIGTERM", () => quit());
  process.once("uncaughtException", (error) => {
    cleanup();
    console.error(error);
    process.exitCode = 1;
  });

  themeTimer = setInterval(() => {
    if (refreshTheme()) {
      draw();
    }
  }, THEME_POLL_INTERVAL_MS);
  themeTimer.unref();

  process.stdout.write("\u001b[?25l");
  draw();
}

main();
