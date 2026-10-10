# Places

The places you have been, on one map.

```bash
pnpm --filter places dev
```

The app runs on port 3001.

```bash
pnpm --filter places test
```

`withAuth` sends each `/auth/*` and `/api/*` path to the gateway at
`BIFROST_URL` (see [`.env.example`](.env.example)), which forwards the places and
the visits to Mimir.

The suite covers what the app holds that is pure: the field readers of the form
and the address, the geometry that decides which region holds a place, the
filter the bar applies, and the sources and the ranking of the search palette.
The components compose `ui`, which carries its own suite.

## The map

Three levels: the world, one country, and — inside the United States alone —
one state. `src/utilities/places-view.ts` holds that model, and every other
question about the map is asked of it: which atlas to draw, which region the
frame is cut to, and what the breadcrumb trail says.

The world draws under Mercator, one country or one state under a mercator
centered on itself, and the United States whole under the composite that is only
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
name.

## The address

Where the reader is lives in the address bar, not in React state: the view, the
filter, and the open place or trip. `src/utilities/places-url.ts` is the codec and
`src/components/places-app/use-place-location.ts` binds it to the address bar, so
a reload keeps the map, the Back button walks the drills, and a place is a link.

The hook writes the address with `history.pushState` and `replaceState`, not with
the router. A router step runs the server page again, and the page reads the
session, the places, and the visits from the gateway. Each open and each close of
a place then waited on those reads. Next patches the two History calls, so
`useSearchParams` gets the new address and the server gets no request.

A drill and an opened place are steps the reader can walk back out of, so each
takes a history entry. Narrowing the bar does not — otherwise leaving the page
would cost one Back press per category picked.

An empty `country` is the world stated outright, which is what parts it from an
address the reader has not written yet. The app writes the view it opened on as
soon as the opening rule settles, so the two are never the same empty address.

## The index

`My places` opens the same set as rows, over the map, and `My trips` opens the
trips. The map answers what is near here; the index answers where that place
was, which is the question a hundred dots cannot. It lists what the filter bar
admits, so the two surfaces never disagree, and its own search finds within
that.

## Trips

A trip is a record with a location, as a place is: a name, its first and last
days, and a location. The location is a town, a city, a region, or a country
that a search finds, not a street address, because a trip often goes to a city
before it has an address in it. A trip is one level above a place, so it holds
the places on it. The map draws places and trips as one mark: a trip is a
amber square with rounded corners, and a place is a dot. While the map draws a
trip, the places on that trip are in its square, and they do not draw or count
on their own. Points that land close together merge into one, whatever their
kind, and the count of a merged point is the number of places and trips that
it holds. A merged point that holds a trip is a square. One pick opens one panel, which lists the places and the
trips of the point under their own headings. The region grouping, the drill,
the panel, the index, and the palette are generic over `Located`, so one code
path serves both kinds.

A trip stores no list of places. A place is on a trip when one of its visits
names the trip with `tripId`, and the Trip field of a visit is the one control
that sets it. A delete of a trip keeps its places and their visits, and Mimir
clears the link. The Show field of the bar picks the kinds that the map draws,
and it shows only while the reader has a trip.

## Data

Mimir, a private service in asgard, keeps the data of each user: the places,
the trips, and the visited regions under a key per atlas. The gateway checks the
session and forwards `/api/places/*`, `/api/trips/*`, `/api/visits/*`, and `/api/photos/*`
to it. Mimir decides who can
change what and how many places a user keeps. `src/api/places-api.ts` calls it
from the browser and `src/server/mimir.ts` from the page, both typed from
`shared/mimir`. After a change to the Mimir API, run
`pnpm --filter shared openapi`. The contract is in asgard's
[`.claude/docs/midgard.md`](https://github.com/charliebeckstrand/asgard/blob/main/.claude/docs/midgard.md).

Photos are in a private bucket on DigitalOcean Spaces. The form uploads each
new file when it saves: Mimir signs an upload address through
`/api/photos/uploads`, and the browser puts the file at that address. A visit or
a trip stores the object key of each photo, and Mimir reads each photo back with
an address that holds for an hour.

The two scopes are kept apart because the names collide: Georgia is a state of
the United States and Georgia is a country.

The geometry comes from `us-atlas` and `world-atlas`, which
`src/utilities/places-atlas.ts` imports into the code of the app. The browser
caches them with the rest of the code.

## The first load

The first paint is the settled page. The atlases are in the code and the page
reads the places and the visits on the server, so the first render has the
opening view, the grouping, and the map in the frame that the address states.
A fetch of the atlas after hydration showed the United States first, and then
faded to the state that the address named.

The index and the form drawer load after the map. The index carries the data
grid, and the form carries the address search and the date picker. The app
fetches their code when the main thread is idle, and renders each panel from its
first open on.
