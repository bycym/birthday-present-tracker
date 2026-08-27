# Birthday Gift Tracker

Privacy-first web app that reads birthdays from your Google Calendars and tracks who already
got a gift this year. No backend: it is a static site hosted on GitHub Pages, and every gift
record lives in your own browser's IndexedDB.

## Local development

```bash
npm install
cp .env.example .env       # then paste your Google OAuth client ID
npm run dev                # http://localhost:5173/birthday-present-tracker/
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run test` | Vitest suite |
| `npm run lint` | ESLint |
| `npm run build` | Type-check (`tsc -b`) + production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Google Cloud setup

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), enable the
   **Google Calendar API**.
2. Create an OAuth 2.0 Client ID of type **Web application**.
3. Add these **Authorized JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://bycym.github.io` (GitHub Pages)
4. No redirect URI is needed — sign-in uses the Google Identity Services token flow, which
   returns the token to the page via a popup callback.
5. Scope requested: `https://www.googleapis.com/auth/calendar.readonly` (read-only).

### Consent screen: keep the app in "Testing"

`calendar.readonly` is a **sensitive** scope, so Google gates who may sign in:

| Publishing status | Who can sign in |
|-------------------|-----------------|
| **Testing** | Only accounts listed under *Test users* (max 100). No Google review needed. |
| **In production** | Nobody, until the app passes Google's verification review. |

For personal use, leave the app in **Testing** and add each user's Google account under
**Google Auth Platform → Audience → Test users**. Signing in with an account that is not on that
list produces *"Access blocked: … has not completed the Google verification process"*
(`access_denied`).

Testing mode also expires refresh tokens after 7 days — harmless here, because this app only
ever holds a short-lived access token in memory and re-requests it each session.

### Why not authorization-code + PKCE?

A GitHub Pages build is a public client with no server. Google's token endpoint requires a
client secret for "Web application" clients, so a browser-only PKCE code exchange is not
possible without a backend. Google Identity Services' `initTokenClient` is the supported
browser-only equivalent: it returns a short-lived access token directly, and never issues a
refresh token or requires a secret. The token is held in memory for the tab only and is never
written to IndexedDB, localStorage or sessionStorage.

### Sessions and page refreshes

The Google access token is kept in `sessionStorage`, so refreshing the page or opening a deep
link does not force a new sign-in. Closing the tab ends the session, and a token older than its
expiry is discarded on load.

This is a **deliberate deviation from the PRD's "never store Google credentials" rule**, taken
because Google Identity Services always opens a *popup* for `initTokenClient` — `prompt: 'none'`
only skips the consent and account-picker screens, it does not make the flow invisible. Signing
in therefore has to start from a user gesture, so there is no way to restore a session silently
on load. The exposure is bounded:

- `sessionStorage` is per-tab and same-origin; other tabs and other sites cannot read it.
- The stored value expires in about an hour, and no refresh token exists to renew it.
- Signing out clears the entry and calls Google's `revoke`.

When the token ages out mid-session the app returns to the sign-in screen rather than trying to
renew, because renewal would need a popup that the browser blocks without a user gesture.

## GitHub Pages deployment

Deployment runs automatically from [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
on every push to `main`.

One-time repository setup:

1. **Settings → Pages → Build and deployment → Source**: `GitHub Actions`.
2. **Settings → Environments → `prod`**: add `VITE_GOOGLE_CLIENT_ID` with your OAuth client ID.
   A variable is the natural fit (it is a public identifier, not a secret), but the workflow
   accepts either a variable or a secret.

   The **build** job in `deploy.yml` declares `environment: prod`, because environment values
   only resolve in a job that claims that environment — and the build is where the value is
   baked into the bundle. If `prod` has required reviewers or a wait timer, the build waits on
   them before running. The deploy job keeps its own `github-pages` environment, which
   `actions/deploy-pages` requires.

   `ci.yml` deliberately builds *without* the client ID: claiming `prod` there would make every
   pull request wait on that environment's protection rules, and nothing in lint, type-check or
   test needs a real value. `deploy.yml` fails loudly if it is missing or still the placeholder.
3. `base` is derived from `GITHUB_REPOSITORY` at build time, so renaming or forking the repo
   needs no code change. Locally it falls back to the `name` field in `package.json`, which must
   therefore match the repository name.

Deep links (`/birthday-present-tracker/settings`) work through the standard SPA fallback:
[`public/404.html`](public/404.html) stashes the path in the query string, and a small script in
[`index.html`](index.html) restores it before React Router boots.

After the first visit the app shell is cached by [`public/sw.js`](public/sw.js), so the UI still
loads offline. Google Calendar responses are never cached — they need a live token.

## Architecture

```
Google Calendar API → Birthday Providers → canonical Birthday model
                                              ↓
                              Business services → IndexedDB (Dexie)
                                              ↓
                                          React UI
```

| Layer | Location |
|-------|----------|
| Auth (Google Identity Services) | `src/auth/`, `src/contexts/` |
| Calendar HTTP client | `src/api/` |
| Birthday source strategies | `src/providers/` |
| Domain services | `src/services/` |
| Persistence (repository pattern) | `src/db/` |
| Query hooks | `src/hooks/` |
| Pages & components | `src/pages/`, `src/components/` |

### Date ranges

The dashboard range dropdown, in order:

1. **Last 30 and next 30 days** — the default, a window either side of today
2. Next 30 / 60 / 90 days
3. Past 30 / 60 / 90 days
4. Custom range — both dates free-form, so any period works

The chosen default is stored in Settings. Past birthdays show the gift record for the year the
birthday fell in, so last year's entries stay editable.

### Offline cache

Fetched birthdays are stored in IndexedDB, so opening the app shows the list instantly and it
keeps working with no network. One fetch pulls a wide window — 90 days back to 366 days forward
— and every narrower range is answered from that copy without another request.

The cache is bypassed when it cannot answer the question: a changed calendar selection, changed
keywords, or a range reaching outside the fetched window. Otherwise it is used until it ages
past the **cache lifetime** in Settings (default 1 day; 1 hour to 2 weeks available).

Offline behaviour is deliberate:

- **Refresh never deletes.** It ages the cache out (`fetchedAt = 0`) so the next load goes to
  Google, keeping the saved rows as a fallback if that request fails. The button is disabled
  while offline.
- **No doomed requests.** When `navigator.onLine` is false the cache is served directly. Only a
  cache that cannot answer the question raises `OfflineError`.
- **Queries are not paused.** TanStack Query's default `networkMode: 'online'` would pause every
  query while offline, so `queryFn` would never run and the IndexedDB cache would never be read.
  The client sets `networkMode: 'offlineFirst'` because every query here can answer locally.
- **Self-healing.** A `window` `online` event refetches birthdays and calendars automatically.

The dashboard shows where the data came from and how old it is, plus a **Refresh** button;
Settings has the same action.

### Colour palettes

Three palettes ship, each working in both light and dark mode, selectable in Settings:

| Palette | Colours |
|---------|---------|
| Coral | `#F38181` `#FCE38A` `#EAFFD0` `#95E1D3` |
| Citrus | `#70FFD2` `#FFFC8C` `#FFCC4D` `#FF9137` |
| Pastel | `#A8D8EA` `#AA96DA` `#FCBAD3` `#FFFFD2` |

Everything is CSS custom properties: `.dark` on `<html>` swaps light/dark, `data-palette` swaps
the colour set, and utilities read `var(--color-*)`, so no component knows which palette is
active. Adding a fourth means adding one CSS block and one entry in the Settings list.

Each palette also exposes its four colours as `--color-p1`…`--color-p4`. Every birthday row is
assigned one of them by hashing the birthday id, which drives the row's left rail, background
wash and avatar — stable per person, varied across the list, and repainted whenever the palette
changes.

### Recognising birthday events

Ordinary calendar events are treated as birthdays when their title contains one of the
**birthday keywords**, editable under *Settings → Birthday keywords*. Defaults:

```
birthday, szülinap, születésnap
```

Matching ignores case, accents and word order, and tolerates glued-on suffixes, so all of these
resolve to the name `Anna`:

| Title | Name |
|-------|------|
| `Birthday - Anna` | Anna |
| `Anna's birthday` | Anna |
| `Anna szülinap` | Anna |
| `Anna születésnapja` | Anna |
| `SZÜLINAP: Anna` | Anna |
| `Anna szulinap` (no accents) | Anna |

Cake and party emoji (🎂 🎉 🥳 🎁) always mark a birthday regardless of the keyword list. A
calendar whose *own name* contains a keyword (e.g. "Szülinapok") is treated as a dedicated
birthday calendar, so every event on it counts even with a bare name as the title.

### Adding a birthday source

Implement `BirthdayProvider` in `src/providers/`, export a predicate that decides which
calendars it owns, and add it to `createProviders()` in `src/services/birthdayService.ts`.
Nothing in the UI changes.
