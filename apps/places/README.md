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

## The map

Three levels: the world, one country, and — inside the United States alone —
one state. `src/utilities/places-view.ts` holds that model, and every other
question about the map is asked of it: which atlas to draw, which region the
frame is cut to, and what the breadcrumb trail says.

The app opens on the smallest geography that holds every place. A collection the
states atlas accounts for whole opens inside the United States; one it cannot
opens on the world. The question is asked of the geometry, never of a country
name, and the countries atlas is fetched only once a view draws it.

## Data

Places live in `.data/places.json`, written by the route handlers under
`app/api/places`. `src/server/places-store.ts` is the one module that knows
where they live, so a gateway or a database replaces that file alone.

Visited regions live beside them in `.data/visits.json`, under a key per atlas.
The two scopes are kept apart because the names collide: Georgia is a state of
the United States and Georgia is a country.

The geometry comes from `us-atlas` and `world-atlas`, served by
`app/api/atlas/states` and `app/api/atlas/countries`. The routes keep both
atlases out of the JavaScript bundle and let the browser cache them.
