# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## Coding Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### 5. Git Commands

**Use `git -C <path>` instead of `cd` before git.**

- Prefer `git -C E:/githome-windows/tools status` over `cd E:/githome-windows/tools && git status`
- This keeps the working directory stable and avoids side effects from `cd`

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Structure

Wxsms Tools — personal toolset built with Vue 3 + Vite + Tailwind CSS + DaisyUI.

```
├── index.html              # Entry HTML
├── vite.config.js           # Vite config (vue + tailwindcss plugins)
├── package.json             # Dependencies
├── public/
│   └── favicon.svg
├── src/
│   ├── main.js              # App entry, mounts Vue + Router
│   ├── App.vue              # Root component: sidebar + nav + router outlet
│   ├── router.js            # Route definitions
│   ├── style.css            # Global styles
│   ├── composables/
│   │   └── useTheme.js      # Dark/light theme toggle
│   └── views/               # One .vue file per tool
│       ├── Home.vue
│       ├── Base64.vue
│       ├── Gzip.vue
│       ├── MD5.vue
│       └── Diff.vue
```

### How to Add a New Tool

1. **Create view** — Add `ToolName.vue` under `src/views/`, follow existing tool patterns
2. **Register route** — Import and add route in `src/router.js`: `{ path: '/tool-name', component: ToolName }`
3. **Add sidebar entry** — Append to `tools` array in `src/App.vue`: `{ name: 'Tool Name', path: '/tool-name', icon: XxxIcon }`, and import the icon

All three steps are required.

### Icon Source

Uses `@heroicons/vue` outline style icons.

- Browse at: https://heroicons.com/
- Pick outline style, copy the component name (e.g. `DocumentPlusIcon`)
- Import from `@heroicons/vue/24/outline`

### Lint

Run `npm run lint` before committing. CI will enforce this on PRs to master.

### Test

Run `npm run test` before committing. CI will enforce this on PRs to master.
