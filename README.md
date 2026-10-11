# Facet

Facet is a browser puzzle game about pressure, fracture, and chain reactions. Swap neighboring gems into lines of three or more. Clears strain the stones beside them; a fully flawed stone joins any clear that touches it and scores double. Longer runs leave powerful brilliant, star, and prism cuts.

## Run locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To create the self-contained static release:

```sh
npm run build
```

The result is written to `dist/` and works at an origin root or sub-path. All production art, particles, music, and sound are committed under `public/assets/`; builds need no authoring tools.

## Controls

- Drag with a mouse, pen, or finger between neighboring gems, then release.
- Arrow Up/Down: navigate menus
- Enter or Space: confirm
- Escape or P: pause/resume
- M: mute
- Escape: back
- Backquote: diagnostics

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` for the full quality suite.
