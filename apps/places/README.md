# Places

The places you have been, on one map.

```bash
pnpm --filter places dev
```

The app runs on port 3001.

```bash
pnpm --filter places test
```

The suite covers what the app holds that is pure: the schema both edges read a
body through, the geometry that decides which region holds a place, the filter
the bar applies, and the atomic file mechanism the stores write through. The
components compose `ui`, which carries its own suite.

## Data

Places live in `.data/places.json`, written by the route handlers under
`app/api/places`. `src/server/places-store.ts` is the one module that knows
where they live, so a gateway or a database replaces that file alone.

The map's geometry comes from `us-atlas`, served by `app/api/atlas/states`. The
route keeps the atlas out of the JavaScript bundle and lets the browser cache it.
