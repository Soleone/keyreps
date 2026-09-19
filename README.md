# typegod

A tiny terminal game for learning Unix and Readline keyboard shortcuts.

It runs a simulated command line, so practice never executes a real shell command.
Each drill gives you a target line and scores correctness, speed, efficiency, and
whether you used the shortcut being taught.

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
reset a drill, and `Enter` to submit it.

## What it teaches

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
