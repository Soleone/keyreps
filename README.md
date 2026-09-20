# Key Reps

A tiny terminal game for learning Unix and Readline keyboard shortcuts.

<img width="1324" height="708" alt="image" src="https://github.com/user-attachments/assets/be68bdae-51b0-480d-9062-2201e5819842" />

It runs a simulated command line, so practice never executes a real shell command.
Each drill gives you a target line and tracks the keyboard presses needed to solve
it. The expected number is perfect in green, up to two extra presses are close in
yellow, and larger detours are red.

## Install

Requires Node.js 20 or newer. Once published, install Key Reps globally:

```bash
npm install --global @soleone/keyreps
keyreps
```

You can also run it without a global install:

```bash
npx @soleone/keyreps
```

## Development

From a checkout, install dependencies, run the tests, and start the compiled CLI:

```bash
npm install
npm test
npm run build
node dist/src/cli.js
```

For local development, `npm link` makes the command available as `keyreps`.

```bash
npm link
keyreps
```

## Release

Releases use [`np`](https://github.com/sindresorhus/np) from a clean `main` or
`master` checkout. Release tooling requires Node 22+ and npm 10+; the CLI itself
still supports Node 20+. It runs the tests, bumps the package version, creates a
Git tag, and publishes to npm. A release hook prints npm's WebAuthn URL when a
passkey is required.

Preview a release without changing Git or publishing anything:

```bash
npm run release -- 0.1.1 --dry-run --no-publish
```

To perform a release, choose a version increment instead:

```bash
npm run release -- patch
```

The program needs an interactive POSIX terminal. Press `Ctrl+C` to quit, `Esc` to
reset a drill, `Enter` to submit it, `Ctrl+Up` for the next lesson, and
`Ctrl+Down` for the previous lesson.

When a Nerd Font is installed, the interactive UI adds a few small icons to its
section landmarks. Detection uses `fc-list`; set `KEYREPS_ICONS=text`
to keep the text-only layout or `KEYREPS_ICONS=nerdfont` to force the icons.

## Theming

When running under Omarchy, Key Reps reads the active theme from
`$XDG_STATE_HOME/omarchy/current/theme/colors.toml` and uses its accent, text,
status, border, and panel colors. Outside Omarchy it falls back to basic ANSI
colors. Set `KEYREPS_THEME_FILE` to preview another Omarchy-compatible
`colors.toml` file. While the game is running, it checks for theme changes every
750 ms and redraws after a successful reload.

## What it teaches

The drills progress from individual shortcuts to command combinations. Intermediate
stages require several editing commands in one repair. Expert stages hide their
instructions until a wasted key press or failed attempt reveals the safety net.

- `Ctrl+A` and `Ctrl+E`: start and end of line
- `Ctrl+B`, `Ctrl+F`, and the left/right arrow keys: character movement
- `Alt+B` and `Alt+F`: word movement
- `Ctrl+Left` and `Ctrl+Right`: word movement when supported by the terminal
- `Ctrl+U` and `Ctrl+K`: kill to the start or end
- `Ctrl+W` and `Alt+D`: kill words
- `Ctrl+Y`: yank the last kill
- `Ctrl+T`: transpose characters
- `Ctrl+D`: delete under the cursor

The editor, terminal decoder, and game state are separate so the behavior can be
tested without needing a terminal.
