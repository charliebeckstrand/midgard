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

The world draws under Mercator, one country or one state under a mercator
centred on itself, and the United States whole under the composite that is only
that country. Mercator is not the honest choice about area — it is the honest
choice about shape, which is what a reader checks a coastline against, and area
is not what a map of places you have been is for.

Antarctica is not drawn. Every world projection stretches the pole into a band
across the foot of the frame, and it takes a tenth of the height to say nothing a
reader of this app is looking for. A place recorded there still draws; it groups
under no country, which is the same answer the map gives for a place at sea.

The app opens on the smallest geography that holds every place. A collection the
states atlas accounts for whole opens inside the United States; one it cannot
opens on the world. The question is asked of the geometry, never of a country
name, and the countries atlas is fetched only once a view draws it.

## The address

Where the reader is lives in the address bar, not in React state: the view, the
filter, and the open place. `src/utilities/places-url.ts` is the codec and
`src/components/places-app/use-place-location.ts` binds it to the router, so a
reload keeps the map, the Back button walks the drills, and a place is a link.

A drill and an opened place are steps the reader can walk back out of, so each
takes a history entry. Narrowing the bar does not — otherwise leaving the page
would cost one Back press per category picked.

An empty `country` is the world stated outright, which is what parts it from an
address the reader has not written yet. The app writes the view it opened on as
soon as the opening rule settles, so the two are never the same empty address.

## The index

`All places` opens the same set as rows, over the map. The map answers what is
near here; the index answers where that place was, which is the question a
hundred dots cannot. It lists what the filter bar admits, so the two surfaces
never disagree, and its own search finds within that.

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
