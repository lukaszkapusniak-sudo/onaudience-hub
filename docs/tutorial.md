# `tutorial.js` — onboarding tutorial

**Path:** [`www/hub/tutorial.js`](../www/hub/tutorial.js)

Full-screen **step-by-step tutorial** with:

- Copy from [`tutorial-i18n.md`](tutorial-i18n.md) (`LANG_META`, `STEP_I18N`)
- **localStorage** flags for completion / progress (does not mutate [`state.md`](state.md) business data)
- **Web Audio** chiptune SFX (`SFX` object) — procedural bleeps
- Optional hooks into `window` for Gmail connect steps

## Exports

`startTutorial`, `resetTutorial`, `isTutorialDone`, `initKonami` (Konami code listener).

Designed to be **safe to skip**: minimal coupling; calls into hub only via `window` where needed.
