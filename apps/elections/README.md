# Elections

Election results by state, district, and county. The first election is the
2026 midterms of the US: the Senate, the House, and the governors.

```bash
pnpm --filter elections dev
```

The app runs on port 3003. It is public: it has no sign-in, and it reads no
data of a user.

Each push to `main` deploys the app to `elections.ivoryimage.dev`, through the
`elections` component of [`.do/app.yaml`](../../.do/app.yaml). The build
prerenders the pages, so it reads civicAPI.

```bash
pnpm --filter elections test
```

## The results

[civicAPI](https://civicapi.org) gives the results. It is free, needs no key,
and asks for attribution, which the foot of each page with results gives. The server of the
app is the only reader. `src/server/civic.ts` reads `race/{id}`, and
`src/server/civic-race.ts` reads each field of the answer into the types of
the app. The parser fails closed: an answer without a field that the screens
need throws, and the error page shows it. A skipped row would change a total
with no sign.

Three national races give the whole picture of the midterms: the race of each
state or district, and the seats of each party. One race of a state gives its
counties. The cache keeps each parsed race for a minute while the count goes
on, and for hours once the race is fully in and called. While votes are
counted, `LiveRefresh` from `shared` renders the page again each minute.

A county row with a FIPS code joins the county of `us-atlas`. A `County` row
with no code takes the code of the atlas county of the same name, with no
periods. A `County` row with no code, no atlas county, and no votes changes no
total, so the parser leaves it out: Chicago is such a row in the House
districts of Illinois, and Cook holds its votes. The Alaska
areas of Chugach and Copper River add into the Valdez-Cordova area that the
atlas still draws. The towns of New England and the state house districts of
Alaska are parts of a county row, so the parser leaves them out.

## The elections

`src/elections/registry.ts` holds the elections. A new election is one more
entry, with the same routes and screens: the screens read the kind of each
contest (`chamber` or `executive`), never the name of an office.

## The routes

| Route | Page |
| --- | --- |
| `/` | Every election |
| `/2026` | The elections of a year |
| `/2026/us` | The elections of a country in a year |
| `/2026/us/midterms` | The overview: the balance of power, the closest races, and the latest calls |
| `/2026/us/midterms/senate` | The national map of an office |

The first three routes are the level pages. Each level page is the same
compilation of the elections of its scope (`src/components/level-view`). A
Segment switches between two views: a list of the elections that are counted
now, then the elections to come, then the past elections, and a calendar with
each election day marked. A Filter button opens a dialog with a form of the
year and the country, which every election has. A field shows only where it
has two options or more, and the button shows only where a field shows. A card
names the election, its country, and its day, and no office. The trail of the header is the
title of a level page, so the heading of the body is only for a screen reader.

The Drawer shows a state, its offices, its districts, and its counties over
each page of an election. Its step is in the search params:
`?region=ga` opens the overview of a state, `&office=senate` its race,
`&district=06` a district of the House, and `&county=13121` a county.

`src/utilities/elections-url.ts` reads and writes the paths and the params, and
`src/hooks/use-drawer-step.ts` moves the Drawer.

The search in the header of an election finds its states and races, and a
pick opens the Drawer on the page. The search in the header of each level page
finds each election and the states and races of each, and a pick opens the page of the
election with the Drawer on the state or the race. `src/utilities/race-search.ts`
gives the rows of both.

The layout of an election renders the view of each of its pages, and
`src/components/election-views` shows the view of the current page. The other
views stay mounted and hidden, so an office switch shows a view that is already
rendered. A page holds only its Drawer and its live refresh.

## The design

Each screen shows only what a reader needs. No label reads "All", and a title
has no badge beside it. The cards stack in one column, and a page at
390 px wide has no overflow. The status of the count shows only in the footer. A page with no results has no footer.

A call is a solid green dot before the percent reporting. A race that is not
called has an amber dot that pulses. Green is for a call, so no party takes it. A
winner has a green circle check after the name.

The Democratic party is blue and the Republican party is red. A choice with no
party, a nonpartisan race, and a write-in are zinc. Each other party is amber.
The margin of a race is the lead of the leader over the runner-up, of any
party.

A map shows the winner of each region. A race that is not called shows a soft
tone of the color of the leader. A House delegation of two parties shows the
stripes of both. A state with no race ignores a click.

An election has no `loading.tsx`. Its layout renders the header, so the header
stays while a page changes.
