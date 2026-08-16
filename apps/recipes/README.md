# Recipes

A cookbook you keep, with the weekly meal plan — Rota — as a section of it.

```bash
pnpm --filter recipes dev
```

The app runs on port 3002.

```bash
pnpm --filter recipes test
```

The suite covers what the app holds that is pure: the schemas every edge reads a
body through, the fold that turns the cook log into counts and orders, the filter
the bar applies, the reader that turns a typed ingredient line into a record, the
address codec, and the atomic file mechanism the stores write through. The
components compose `ui`, which carries its own suite.

## The frame

Every page is drawn in the same three parts: a title row that carries the trail
and the controls, a row under it that a page fills only if it has something to
put there, and the body between them and the foot of the window. The body is the
one thing that scrolls, so a filter bar stays put while a long list moves under
it.

The list fills the second row with its filters. A recipe page has nothing to
narrow, so it fills the same row with Edit, Favourite, Cooked today, and Delete —
which is where a reader who came from the list has just been looking.

## The ingredient list

A recipe is copied off a page or out of a head, one line at a time, so the form
takes lines rather than a repeating row of three fields.
`src/utilities/ingredient-line.ts` reads them: `2 kg potatoes` is a quantity, a
unit, and an item; `salt, to taste` is an item.

A unit is only read from a known list. Anything else is the first word of the
item, because "2 large onions" measures onions in nothing and `large` is not a
unit this app should invent. A bare number stays an item too — a reader who wrote
`12` meant something by it.

The write is the exact inverse of the read, so a record dressed back up as text
and parsed again is the record it started as. Without that, a save the reader
made no change to would quietly rewrite the list.

## The three records

A **recipe** is a record the reader edits. A **cook** is an event that happened.
A **plan entry** is a decision about a day that has not arrived yet. They are
three files and three stores, because they are three different kinds of thing.

The plan is intent and the cook log is fact, and nothing turns one into the
other on its own. A planned meal that the reader skipped must leave nothing
behind, so a cook is written when they say it was cooked — never when a day
passes. An invented event would be counted by everything downstream, and the
reader would have no way to take it back.

## What the log is for

Nothing stores how often a recipe is cooked. `src/utilities/recipe-rank.ts`
folds the log per read, joins the two facts — the count and the last day — onto
each record, and answers the orders the list and the palette sort by.

A counter kept on the record would have to be corrected by every write that
touches a cook, and the first one that forgot would leave a list ordered by a
number nothing in the app could explain. The fold is one pass over a file that
one reader fills, which is smaller than the atlas the map app fetches on load.

Days are `YYYY-MM-DD`, so the later day is the greater string and the fold builds
no dates to find it.

## Order

The list carries the reader's own order, held on the record as `order`, because
it is a decision and not a measurement: no other field implies it, and nothing
but a drag changes it.

The other three orders — by name, by how often, by how recently — are
measurements, and a drag cannot write to them. So a drag is offered only while
the list is in the reader's own order. Every order ends on the name, so two
recipes that tie still hold a fixed position between reads.

A reorder sends ids rather than records. A whole record sent back from the
browser would let a stale card overwrite an edit that landed between the read
and the drop.

## Data

Records live under `.data/`, one file each: `recipes.json`, `cooks.json`, and
`plan.json`. Each has exactly one store module that knows where it is, so a
gateway or a database replaces three files and nothing else.

Every write goes through the queue in `src/server/json-file.ts` and lands by
rename, so a write that dies halfway leaves the last good file and two requests
arriving together cannot write over one another.

A record that no longer reads as one is dropped on the way out of the store. A
hand-edited file must not put a card with no name in the list.

A cook or a plan entry pointing at a recipe that has been deleted is not a
record — it is a row the calendar would draw as a blank. The route that deletes
a recipe clears both; a store never reaches across to another store's file.

---

**See also:** [`../../README.md`](../../README.md),
[`../../CONVENTIONS.md`](../../CONVENTIONS.md).
