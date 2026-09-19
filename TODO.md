# TODO

## Now


## Next

- [ ] **remove · MISSES 0 · TOTAL 27** — dont think we need that concept. we mainyl care about completing currnet lesson effectively no matter how many retrries. and total progress of all lessons.
- [ ] **reverse keys count display**
  - instead of counting up we should count down, potentially into negative (keep one leading space that can be replaced with - to avoid shifting the content.
  - so for each lesson it starts by showing the amount of keys optimally needed, the goal is to land at 0
- [ ] **bug: lesson 8**
  - · empty line
  - is cnfusing i think it should just literaly show an empty line (we still have the $ prefix) and then the cursor position below
- [ ] **challenge 14 is exactly like challenge 1** — we should not have so similar challenges. and if we have similar challenges for a good reason, and thechallenges are on the same tier for the same key, then tey should be co-located

## Later


## Archive

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
