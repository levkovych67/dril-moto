# Changelog

## Unreleased

- Форк від upstream `889a0914da5fd40405190907e493fc6be72c38a2` без асетів Codebrew (levels.mrg, logo, splash, спрайти байка); плейсхолдери спрайтів тих самих розмірів; енкодер/декодер `.mrg`; дев-пак із JSON-треків.
- Шаблони спрайтів для дизайнера: `docs/sprites.md`, `docs/sprite-templates/*@8x.png` (`npm run sprites:template`).
- Правила геометрії JSON-треку (`src/shell/trackJson.ts`) і безголовий прогін треків на фізиці двигуна: `scripts/sim-track.mjs` (`npm run sim`), водії ai, «лише газ», бот і планувальник.
