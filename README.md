# Дріл Мото

Мототріал у браузері: байк на полігональному треку, газ, гальмо, нахил назад і вперед,
секундомір, три ліги. Гра живе на сайті shchilnui Drill за адресою `/moto` (iframe), але
збирається й працює і сама по собі.

Це форк відкритого веб-порту [yurkagon/gravity-defied-web](https://github.com/yurkagon/gravity-defied-web)
під GPL-2.0. З порту взята лише механіка (фізика, трек, рендер канвасу); треки, спрайти, назва,
меню й оболонка — наші. Походження, закріплений коміт upstream і права — у [NOTICE.md](NOTICE.md),
зміни — у [CHANGELOG.md](CHANGELOG.md). Гра не повʼязана з Codebrew Software.

## Запуск

Потрібен Node 24 (`.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:3100/
```

У `npm run dev` без пака сайту гра бере дев-пак `src/assets/dev-pack.mrg` (треки з `tracks/dev/`).

## Збірка й перевірки

```bash
npm run check      # check-mrg, check-race-loop, check-progress, check-palette
npm run lint
npm run build      # tsc -b && vite build → dist/
npm run preview    # перегляд dist/
```

`dist/` самодостатня й має лише відносні шляхи (`base: './'`), тож працює з будь-якої теки,
зокрема з `/moto/` на сайті. Сам пак треків (`tracks/dril.mrg`) у `dist/` не входить — його
кладе сайт.

## Параметри URL

| Параметр | За замовчуванням    | Що робить                                                                     |
| -------- | ------------------- | ----------------------------------------------------------------------------- |
| `tracks` | `./tracks/dril.mrg` | URL пака треків; поруч шукається індекс назв (той самий шлях з `.json`)       |
| `ns` | `dril-moto` | префікс ключа `localStorage` з прогресом: `${ns}:progress:v1` |
| `lang` | `uk` | мова рядків; поки лише `uk` |
| `theme` | `light` | `light` або `dark` — токени й палітра канвасу з `src/shell/theme.css` |
| `debug` | — | FPS у HUD і `json=<url>`: JSON-трек або пак без збірки, заїзд стартує одразу |

Індекс назв — масив `[{ league, index, name, slug }]`; без нього списки показують ASCII-назви з
`.mrg`.

## Повідомлення сайту

Гра шле `window.parent.postMessage(msg, window.location.origin)` лише з iframe:

- `{ source: 'dril-moto', type: 'ready', version }` — показано перший екран гри (сплеш, а з `?debug&json=` — заїзд); пак, спрайти й шрифт e-Ukraine ваг 700 і 500 (ними намальовано сплеш і меню) уже завантажені;
- `{ source: 'dril-moto', type: 'exit' }` — «Вийти» в меню чи паузі;
- `{ source: 'dril-moto', type: 'finished', league, track, timeMs, best }` — після фінішу.

## Треки

Трек — JSON в одиницях треку, як `tracks/dev/01-lanka.json`: `name`, `start`, `finish`,
`points`. y росте вгору; старт на 15–30 одиниць вище землі, під обома колесами рівно; фініш —
лише x (y = 0); x точок строго зростає. Усі правила перевіряє `src/shell/trackJson.ts`.

```bash
npm run dev-pack                                    # tracks/dev/*.json → src/assets/dev-pack.mrg
node scripts/sim-track.mjs tracks/dev/02-hirka.json # прохідність на фізиці двигуна, без браузера
```

`sim-track` проганяє кожен трек водіями `ai` (демо-автопілот порту), «лише газ» і `bot`; для треку,
якого не пройшов жоден із них, сам запускає планувальник (≈1 хв на трек; `--no-plan` вимикає).
`--driver ai,gas,bot,plan` — усі чотири водії на кожному треку. Трек, який не проходить і
планувальник, заважкий.

Швидко подивитись трек без збірки: `npm run dev` і
`http://localhost:3100/?debug&json=/tracks/dev/02-hirka.json` (dev-сервер віддає файли з кореня
проєкту; JSON-пак `{ "leagues": [[…], […], […]] }` теж підходить). Заїзд стартує одразу, прогрес
такого заїзду пишеться окремо (`${ns}:json:progress:v1`) і не чіпає справжній.

## Спрайти

Розміри, сітки кадрів і кут кожного кадру — у [docs/sprites.md](docs/sprites.md), шаблони —
`docs/sprite-templates/*@8x.png`. Готові файли кладуться в `src/assets/` у розмірі 1×.

```bash
npm run sprites:template     # docs/sprites.md і шаблони
npm run sprites:placeholder  # тимчасові спрайти тих самих розмірів
```

## Реліз

1. `npm version X.Y.Z --no-git-tag-version` (версія в `package.json` і `package-lock.json`), дописати `CHANGELOG.md`.
2. Якщо змінились `LICENSE.md` чи `NOTICE.md` — `cp LICENSE.md public/LICENSE.txt && cp NOTICE.md public/NOTICE.txt`.
3. `git tag vX.Y.Z && git push origin vX.Y.Z` — GitHub Actions (`.github/workflows/release.yml`)
   перевіряє, збирає й публікує GitHub Release з `dist.zip` (вміст `dist/` у корені архіву).
4. На сайті: `node scripts/sync-moto-bundle.mjs --tag vX.Y.Z` — перевіряє архів, кладе його в
   `public/moto/` без `tracks/` і пише `VERSION`. Руками архів у `public/moto/` не розпаковувати.

## Ліцензія

GPL-2.0 — [LICENSE.md](LICENSE.md). Шрифт e-Ukraine (`public/fonts/e-ukraine/`) — CC BY 4.0,
https://thedigital.gov.ua/fonts.
