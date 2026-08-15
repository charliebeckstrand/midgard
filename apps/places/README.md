# Places

The places you have been, on one map.

```bash
pnpm --filter places dev
```

The app runs on port 3001.

## Data

Places live in `.data/places.json`, written by the route handlers under
`app/api/places`. `src/server/places-store.ts` is the one module that knows
where they live, so a gateway or a database replaces that file alone.

The map's geometry comes from `us-atlas`, served by `app/api/atlas/states`. The
route keeps the atlas out of the JavaScript bundle and lets the browser cache it.
