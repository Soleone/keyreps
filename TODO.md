# TODO

## Now


## Next

- [x] **for duplicate lessons of the same key spice things up** — have the second or third lesson require something else. e.g. starting at a different cursor position
- [x] **publish as npm package** — publish the scoped package and document the release workflow
- [x] **rebrand** — align on a great name. it must still be available as global npm package

## Later


## Archive

- [x] **challenge 14 is exactly like challenge 1** — we should not have so similar challenges. and if we have similar challenges for a good reason, and thechallenges are on the same tier for the same key, then tey should be co-located
- [x] **remove · MISSES 0 · TOTAL 27** — keep the current lesson key budget and all-lessons progress, without retry or cumulative key counters in the stats strip.
- [x] **bug: lesson 8**
  - · empty line
  - is cnfusing i think it should just literaly show an empty line (we still have the $ prefix) and then the cursor position below
- [x] **reverse keys count display** — Count down from each lesson's optimal key budget, keeping the sign column stable and allowing negative values.
- [x] **notification area**
  - below the area that says   ENTER submit   ESC reset   CTRL+C quit we want a new notification line.
  - it is mainly relevant when completing a lesson. it should show for 3s. it has 3 sections:
  - icon
  - status (colored)
  - text
  - e.g. check mark icon Perfect separator Lesson completer
- [x] **reorganize screen sections** — Lead with the lesson title, then the goal, current input and status, details and tips, and keyboard-press stats.
- [x] **build more combination stages at the end**
  - intermediate stages combine multiple commands
  - expert tier stages hide instructions until a wasted key press reveals them
- [x] **some commands should probably have multiple stages** — different scenarios, build muscle memory
- [x] **Don't use black tics for wrong characters, those don't get rendered anyway.**
- [x] **make "target cursor" more muted, yellow or accent is overkill. also try to make more elegant in how it looks with nerdfont potentially**
- [x] **for the shortcut also add a brief description right after, just a few words**
- [x] **current stage instructions should be in a bullet list**
- [x] **if available smartly use nerdfont icons** — just dont overdo it, place them elegantly
- [x] **display exactly if you got the perfect score by using minimal keyboard strokes** — dont show abstract points, but amount of keyboard presses that led to victory
- [x] **Clean up score** — Remove the time factor from evaluation and don't have a separate score. The main score here is the amount of keyboard presses that you required. If you have the perfect amount of key presses, it should be green. If it's shortly within the expected ones, it should be yellow. And otherwise, it should be red.
