# Geach Games

**Ten little escapes. One browser arcade.**

Geach Games brings classic arcade ideas into a polished, responsive collection with original canvas artwork, smooth animation, and instant play. Built for [jordangeach.com/games/](https://jordangeach.com/games/).

![Geach Games arcade library](docs/arcade-preview.jpg)

## The collection

| Game | Find your flow |
| --- | --- |
| **Asteroid Field** | Thrust, drift, and blast through waves of space rocks. |
| **Brick Breaker** | Work the angles, clear bricks, and catch paddle power-ups. |
| **Garden Snake** | Gather fruit, grow longer, and plan your next turn. |
| **Cosmic Invaders** | Defend the planet against an advancing alien fleet. |
| **Block Party** | Stack falling shapes and clear lines with hold and ghost previews. |
| **Paddle Club** | Outplay a solo opponent in a first-to-seven match. |
| **Crossy Creek** | Dodge traffic and ride floating logs to the far bank. |
| **Midnight Drive** | Steer through traffic, boost, and chase distance records. |
| **Sky Hopper** | Find a steady flap rhythm and fly through the gaps. |
| **Twenty Forty Eight** | Slide and merge matching tiles toward 2048. |

## Made for a quick game

- Responsive layouts with keyboard, mouse, and touch controls; each game explains its controls before play.
- Search, genre filters, favorites, and a surprise pick when you cannot choose.
- Personal bests and favorites saved automatically in the current browser.
- Optional synthesized arcade audio, muted by default; pause, retry, and a focused playfield.
- Self-contained static files, including fonts and artwork. No production dependencies, external asset requests, accounts, or backend services.

## Run locally

Use **Node.js 22 or later**. There are no packages to install.

```sh
git clone https://github.com/jordanbgeach/geach-games.git
cd geach-games
npm run dev
```

Open [http://127.0.0.1:4188/games/](http://127.0.0.1:4188/games/). Set `PORT` to use a different local port. Serve the files over HTTP; browser modules do not load correctly from a direct `file://` preview.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Serve the source locally on port 4188. |
| `npm run check` | Check JavaScript syntax and subdirectory-safe entry paths. |
| `npm test` | Run the game and shared-engine regression tests. |
| `npm run build` | Create the production upload folder at `dist/`. |

To preview the build, run `node scripts/serve.mjs --dist` after building. Scores and preferences belong to each browser and origin; they do not sync between devices.

## Deploy to Hostinger

Run the checks and build, then upload the **contents** of `dist/`, including `.htaccess`, to `public_html/games/`. The site uses relative assets and needs no Node.js runtime, database, or routing fallback on the host.

See [HOSTINGER.md](HOSTINGER.md) for the complete deployment guide. The GitHub Actions workflow checks, tests, and builds every push and pull request, then provides the built site as a downloadable artifact.

## Project layout

```text
index.html          Arcade library and game shell
src/app.js          Navigation, input, scoring, and game lifecycle
src/games/          Ten independent canvas games
src/engine/         Audio, storage, and shared game helpers
src/art.js          Original illustrated game covers
assets/             Local fonts and favicon
scripts/            Dependency-free development and build tools
tests/              Game-rule and engine regression tests
```
