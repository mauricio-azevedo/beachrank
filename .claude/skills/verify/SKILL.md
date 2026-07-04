---
name: verify
description: Build, run and drive Arena (api + web) to verify changes end-to-end — dev-server bring-up, browser driving with puppeteer-core, and API probing patterns.
---

# Arena — verify recipe

## Bring-up (order matters)

1. Postgres: `docker-compose up -d` at the repo root → `localhost:5433` (db per `api/.env`).
2. **API first** (`cd api && npm run start:dev`) — it binds `:3000` (web's default API base).
3. Web second (`cd web && npm run dev`) — Next auto-shifts to `:3001` because 3000 is taken.
4. Node is off PATH: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22`.

Gotchas:

- Stale `nest start --watch` processes survive old sessions, lose the port race after a
  recompile and serve stale code / EADDRINUSE loops. Before starting:
  `pgrep -af 'arena/[a]pi|[n]est start'` and kill leftovers (bracket trick avoids
  pkill self-match; a plain `pkill -f 'next dev'` kills your own shell).
- Ready checks: `curl localhost:3000/groups` returns JSON (api); web prints `Local:` in its log.

## Drive the UI

`puppeteer-core@23` + system Chrome works headless (no download):

```js
puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 }); // mobile-first
```

- Auth without driving login: `POST /auth/register` → `accessToken`, then on any page
  `localStorage.setItem('arena_access_token', token)` and navigate.
- vaul sheets animate ~300-500ms: after `waitForSelector`, sleep ~500ms before clicking
  inside a freshly opened sheet, or clicks land mid-slide ("not clickable").
- Nested sheets portal in DOM order — for duplicated button labels, click the **last**
  match (topmost sheet).
- Selectors: `text/...`, `[aria-label="..."]` both work well.

## Probe the API

`POST /auth/register` (firstName/lastName/email/password) → token; `POST /groups`
({name}); `POST /groups/:id/members/guest` ({name}); invites under
`POST /groups/:id/invites` and public `GET/POST /invites/:token[...]`.

Dev-mode note: React StrictMode double-fires effects → duplicate POSTs on sheet opens.
Anything create-on-open must be idempotent server-side (see the invite advisory lock);
when asserting "stable across opens", assert across _reopens_, and test concurrency with
two parallel curls.
