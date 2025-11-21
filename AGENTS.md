# Repository Guidelines

## Project Structure & Module Organization
All runtime code lives in `src/`. `main.jsx` bootstraps React into `index.html`, while `App.jsx` wires the Mantine `AppShell`, playback controls, and shared state. UI building blocks stay in `src/components/` (`AudioVisualizer.jsx`, `Playlist.jsx`), and reusable imagery or audio samples belong in `src/assets/`. The `public/` folder serves static files verbatim, and production bundles land in `dist/`. Keep feature-specific helpers next to the component they support; promote them into `src/components/` once they are reused in more than one screen.

## Build, Test, and Development Commands
- `npm install` — install dependencies after cloning or when `package.json` changes.
- `npm run dev` — start the Vite dev server with HMR on http://localhost:5173.
- `npm run build` — produce an optimized React bundle in `dist/`; run before tagging releases.
- `npm run preview` — serve the latest build to mimic production routing.
- `npm run lint` — execute ESLint (`eslint.config.js`) across the repo; required before opening a PR.

## Coding Style & Naming Conventions
Favor modern React with function components, hooks, and derived state via `useMemo`/`useCallback`. Follow the existing 2-space indentation, single quotes, and semicolon-free style. Components and contexts use PascalCase (`AudioVisualizer`), hooks use `useCamelCase`, and event handlers read `handleX`. Keep CSS in `App.css`, `index.css`, or a component-specific `.css` sibling. ESLint already enforces the React Hooks rules and `no-unused-vars` (uppercase constants allowed); treat lint warnings as blockers.

## Testing Guidelines
Automated tests are not wired yet, so manual QA is mandatory: upload multiple tracks, scrub the timeline, toggle dark/light themes, and verify waveform rendering. When you add tests, colocate them as `ComponentName.test.jsx` under `src/__tests__/` or beside the component, and cover playlist state transitions plus audio element races. Document any manual steps or gaps inside the PR description until Vitest/Jest is introduced.

## Commit & Pull Request Guidelines
Recent history uses emoji-prefixed, imperative summaries (`🎉 Initial commit: …`). Keep subjects under ~72 characters, group related edits in a single commit, and reference issues or JIRA keys when relevant. Before opening a PR, rebase onto the active feature branch (`001-auth-users` unless told otherwise), run `npm run lint && npm run build`, and attach screenshots or short clips for UI-affecting work. Each PR description should outline scope, testing performed, and any follow-up tasks recorded in `TODO-PLAYLIST.md`.
