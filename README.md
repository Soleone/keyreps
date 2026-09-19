# Unix Keyboard Katas

A tiny terminal game for learning Unix and Readline keyboard shortcuts.

It runs a simulated command line, so practice never executes a real shell command.
Each drill gives you a target line and tracks the keyboard presses needed to solve
it. The expected number is perfect in green, up to two extra presses are close in
yellow, and larger detours are red.

## Run

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run build
node dist/src/cli.js
```

For local development, `npm link` makes the command available as `typegod`.

```bash
npm link
typegod
```

The program needs an interactive POSIX terminal. Press `Ctrl+C` to quit, `Esc` to
reset a drill, `Enter` to submit it, and `Ctrl+Up` / `Ctrl+Down` to move between
lessons.

When a Nerd Font is installed, the interactive UI adds a few small icons to its
section landmarks. Detection uses `fc-list`; set `TYPEGOD_ICONS=text`
to keep the text-only layout or `TYPEGOD_ICONS=nerdfont` to force the icons.

## Theming

When running under Omarchy, Typegod reads the active theme from
`$XDG_STATE_HOME/omarchy/current/theme/colors.toml` and uses its accent, text,
status, border, and panel colors. Outside Omarchy it falls back to basic ANSI
colors. Set `TYPEGOD_THEME_FILE` to preview another Omarchy-compatible
`colors.toml` file. While the game is running, it checks for theme changes every
750 ms and redraws after a successful reload.

## What it teaches

The drills progress from individual shortcuts to command combinations. Intermediate
stages require several editing commands in one repair. Expert stages hide their
instructions until a wasted key press or failed attempt reveals the safety net.

- `Ctrl+A` and `Ctrl+E`: start and end of line
- `Ctrl+B` and `Ctrl+F`: character movement
- `Alt+B` and `Alt+F`: word movement
- `Ctrl+Left` and `Ctrl+Right`: word movement when supported by the terminal
- `Ctrl+U` and `Ctrl+K`: kill to the start or end
- `Ctrl+W` and `Alt+D`: kill words
- `Ctrl+Y`: yank the last kill
- `Ctrl+T`: transpose characters
- `Ctrl+D`: delete under the cursor

The editor, terminal decoder, and game state are separate so the behavior can be
tested without needing a terminal.
