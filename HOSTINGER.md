# Deploy Geach Games to Hostinger

The arcade is a static website intended for **https://jordangeach.com/games/**. It needs ordinary file hosting: no Node.js process, database, API key, or server application is required on Hostinger.

Source repository: [jordanbgeach/geach-games](https://github.com/jordanbgeach/geach-games).

## Build the upload folder

On a computer with Node.js 22 or later, open the source folder and run:

```sh
npm run check
npm test
npm run build
```

There are no package dependencies to install. The build copies the production files into `dist/`.

To preview that exact build locally, run:

```sh
node scripts/serve.mjs --dist
```

Open [http://127.0.0.1:4188/games/](http://127.0.0.1:4188/games/). Use an HTTP server for previews; opening `index.html` directly as a `file://` URL prevents browsers from loading JavaScript modules correctly.

## Upload the contents of dist

1. In Hostinger hPanel, open **Websites**, manage **jordangeach.com**, and open **File Manager**. Open the domain's `public_html` folder. Hostinger's [File Manager guide](https://www.hostinger.com/support/4548688-basic-actions-in-the-file-manager-in-hostinger/) covers the current upload controls.
2. Create a folder named `games` inside `public_html`. If that folder already contains an older games site, download a backup before replacing its files.
3. Upload **everything inside `dist/`**, including the hidden `.htaccess` file, into `public_html/games/`. Keep the `src/` and `assets/` subfolders intact. Upload the contents, not the enclosing `dist` folder.
4. If uploading a ZIP instead, extract it inside `public_html/games/`. After extraction, check that `index.html` is directly inside `games/`; move files out of an extra wrapper folder if necessary. Hostinger provides an [archive extraction guide](https://www.hostinger.com/support/1583613-how-to-extract-archives-using-the-file-manager-in-hostinger/).
5. Visit [https://jordangeach.com/games/](https://jordangeach.com/games/). If you replaced a previous version, reload with the browser cache bypassed.

The final layout should be:

```text
public_html/
└── games/
    ├── index.html
    ├── .htaccess
    ├── assets/
    └── src/
        ├── app.js
        ├── catalog.js
        ├── art.js
        ├── engine/
        └── games/
```

The rest of `public_html` can continue serving your existing website. Only the `games/` directory is used by this arcade.

## How subdirectory hosting works

Assets and JavaScript modules use relative URLs, so no domain or base-path configuration is needed. Individual games open inside the arcade rather than using server routes. No SPA routing fallback or catch-all rewrite is required. The included `.htaccess` sets the default index, module MIME types, compression when available, and cache headers.

Scores and preferences are stored locally in each visitor's browser. They are specific to that browser and website origin; they do not sync between devices or appear as a shared leaderboard.

## Check the published site

- Confirm the library and illustrated game cards load without missing files.
- Launch all ten games and test movement, pause, retry, and returning to the arcade.
- Test a game with touch controls on a phone and with the keyboard on a desktop.
- Set a high score, reload, and confirm it remains in that browser.
- Toggle sound and confirm audio starts after an interaction.

If the page is blank or a game cannot load, first verify that `src/` uploaded completely and that `index.html` is not nested under `games/dist/`. JavaScript requests must return JavaScript, rather than a custom 404 page or your main site's HTML. If the domain's existing root routing intercepts requests to real files in `games/`, adjust that routing to let existing files and directories pass through.

For later updates, build again and replace the contents of `public_html/games/`. Keep a backup of the previous upload until the new version has been checked.
