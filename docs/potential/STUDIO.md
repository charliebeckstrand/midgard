# Studio — a planner for a photo shoot

> **Studio answers when the light falls as a shot needs it, and whether one day holds every shot.** The core is a solar ephemeris, which is arithmetic alone. The value is the day plan that the ephemeris makes possible, and the conflict report when no plan exists.

## Thesis

Places is a map app, and its hard problem turned out to be the projection. Studio is a calendar app, and its hard problem is that a time of day is not a time.

A time of day is an interval. The interval moves with the date and with the latitude, and it moves fastest near the equinoxes. A day is a set of such intervals, with travel between them.

A project holds shots. A shot names a location, a bearing, a duration, and the light it wants: golden, blue hour, open shade, direct sun on a wall, or backlight. From those four facts alone the app answers one question in three forms.

When can this shot happen on this date. Can one day hold every shot. Which day in the next month holds them with the most slack.

## The core

### Solar position

One pure function carries the app. It takes an instant, a latitude, and a longitude, and it returns the sun's elevation and azimuth, by the standard Meeus / NOAA method.

The function is arithmetic. It needs no network, no data file, and no dependency, and it holds accuracy near one arcminute — far past what a shoot needs.

### The named windows

Every named window falls out of that one curve. A root finder over one monotone half-day branch answers all of them, so the app carries one solver rather than a formula per window.

| Window | Elevation band | Note |
|---|---|---|
| Sunrise and sunset | The crossing of −0.833°. | The offset holds atmospheric refraction and the solar radius. |
| Blue hour | −6° to −4°. | Below it the sky is too dark to shoot without light. |
| Golden hour | −4° to +6°. | The band the shot list competes for. |
| Civil twilight | −6° to 0°. | The legal and practical edge of usable daylight. |
| Direct sun | Above +6°. | Hard light, and the only band that is long. |

These are the conventional edges, and photographers disagree on them. Hold them as project settings with these defaults, not as constants in the core.

### Azimuth

Azimuth is what makes Studio a planner for a shoot rather than a sunrise widget. Elevation states the quality of the light. Azimuth states its direction.

A shot carries a bearing — the direction the camera looks, or the direction a subject's face points. The angle between the sun's azimuth and that bearing decides frontal, side, or back light.

So a shot's feasible interval is the intersection of an elevation band with an azimuth band. That intersection is the thing a reader cannot compute mentally, and it is where the app says something new: this wall takes direct light for nineteen minutes, and not on the morning you planned.

## The hard question

Take N shots. Each one holds one or more feasible intervals, a duration, and a location, and a travel time separates each pair of locations. Put them in an order that works.

This is a travelling salesman problem with time windows, at small scale. For a real shoot of ten to thirty shots, the honest answer is a stated policy rather than an optimum: sort by the tightest window, place each shot greedily, then repair locally.

The failure output matters more than the success output. The app must never drop a shot in silence, and it must name the conflict rather than the symptom.

> These two shots both want the same twelve minutes of golden hour, and forty minutes of driving separates them.

That is a finding a planner acts on. Move one shot to the next morning, or change its bearing.

The inverse question needs no second algorithm. Run the same solver across a date range, score each day by total slack, and the calendar itself becomes the answer to "when do we shoot this".

## Limits

The ephemeris gives geometry, not light. A ridge or a tower cuts the sun long before the horizon does, so golden hour on a canyon floor is a lie that a naive planner tells with confidence.

Studio models the sky, not the horizon, and the app must say so where a reader sees a window. Weather is the same admission, for the same reason.

This paragraph is the counterpart of the Antarctica paragraph in the [Places README](../../apps/places/README.md). State what the app declines to answer, and why, beside the answers it does give.

A terrain horizon is a real increment later, from one elevation tile per location. It is not a promise of the first cut.

## Surfaces

The day reads as a `Timeline` of shots over a band of light. The band is an `AreaChart` of solar elevation, with a `ChartReferenceLine` at the horizon, at civil twilight, and across the golden band.

| Surface | Role |
|---|---|
| `timeline` | The day, one item per scheduled shot. |
| `chart` — `AreaChart`, `ChartReferenceLine`, `Crosshair` | The elevation curve under the day, and the marked band edges. |
| `kanban` | The shot board: unscheduled, scheduled, shot. A drag between columns commits a shot to the day. |
| `calendar` — `getDayProps` | The date search. Each cell takes its tint from the slack score of that day. |
| `grid` | The call sheet, and its export. |
| `banner` | What did not fit, and which pair of shots caused it. |
| `date-picker` · `file-upload` · `aspect-ratio` · `stat` · `dl` | The date, reference frames, framing notes, call and wrap times, shot detail. |
| `sector-chart` | Candidate geometry for the compass rose below. |

### What Studio draws out of `ui`

Two items, and neither is a component request.

**One time cursor above two surfaces.** The chart module resolves a crosshair per chart, from that chart's own pointer (`resolveCrosshair`). The map module holds its pointer readout in one internal provider inside a single plat, and splits it across three contexts, so a pointer move repaints the tooltip alone. Studio needs that same pattern one level up: one cursor, two surfaces of different kinds, one repaint. It is the smallest useful form of the linked cursor that the chart module has no contract for.

**The compass rose.** A dial per shot shows the subject bearing against the sun's azimuth as it sweeps the feasible window. The arc geometry already exists in `sector-chart`. Build it as an app component first, and promote it into `ui` only when a second consumer asks for it ([`CLAUDE.md`](../../CLAUDE.md) §1.1).

## Shape

Mirror Places, because the split works. Every hard part is pure, and the React shell renders over it.

| Path | Role |
|---|---|
| `src/core/solar.ts` | Elevation and azimuth for an instant and a coordinate. Pure. |
| `src/core/windows.ts` | Band edges from the root finder, and the intersection with the azimuth band. Pure. |
| `src/core/schedule.ts` | The day solver, the slack score, and the conflict report. Pure. |
| `src/utilities/studio-url.ts` | The codec for the address bar: the date, the open shot, the view. |
| `src/server/projects-store.ts` | The one module that knows where a project lives. |

Where the reader is lives in the address bar, not in React state. The date and the open shot each take a history entry, because each is a step the reader walks back out of. A change to a filter does not, for the reason the Places README gives.

Projects live in `.data/projects.json`, behind the store alone, so a database replaces that one module.

## Proof

The core is unusually easy to test honestly, which is the strongest argument for the app.

- Solar position, against published almanac values, for known coordinates and dates.
- Sunrise and sunset from the root finder, against the same tables, to the minute.
- Band edges at both equinoxes and both solstices, where the windows move fastest.
- A polar latitude in midwinter, where the sun never rises. The window set is empty, which is an answer and not an error.
- A daylight-saving boundary, where the day holds 23 or 25 hours and the schedule must still hold.
- Constructed infeasible shot sets, where the report must name the correct pair.

## Increments

Each increment lands on its own and leaves a whole app behind it.

1. **The core, with no app.** `solar.ts`, `windows.ts`, and the suite above. Nothing renders, and the numbers are already provable.
2. **One date, one project.** The timeline, the elevation curve, the shot list, and a manual order. The app is useful here, and everything after this is leverage.
3. **The compass.** The azimuth intersection per shot, drawn as the dial.
4. **The solver.** The day plan, the slack score, and the conflict banner. No surface changes, because the day already renders what the solver produces.
5. **The date search.** The same solver across a month, scored into the calendar cells.

## Ruled out

**A map of the locations.** Places owns the map story in this repository, and Studio is about time. A location is a coordinate, a name, and a bearing; a picker is enough. Reconsider only if a shoot spans a region.

**A network ephemeris.** The math is small, offline, and stable for a century. A service adds a key, a failure mode, and a cache, and it buys nothing.

**Weather.** A forecast holds a ten-day horizon, so it dates every record the app keeps. The limits section states the boundary instead.

## Open questions

**Who owns the travel time?** A matrix the reader fills, or a route service. The recommendation is the matrix, with a default from great-circle distance and one assumed speed, because it keeps the app offline and the core pure.

**Does a shot carry one bearing or two?** A camera bearing and a subject bearing differ whenever the subject is a face. The recommendation is one bearing in the first cut, and the second one when a real shot list needs it.

**Does the solver optimize, or report?** A greedy pass with local repair is honest and explicable; an optimum is neither, and a reader cannot argue with it. The recommendation is the greedy pass, and a plain statement of the policy beside the result.

---

**See also:** [`README.md`](README.md) · [`../../apps/places/README.md`](../../apps/places/README.md) · [`../../packages/ui/docs/MODULES.md`](../../packages/ui/docs/MODULES.md) · [`../../packages/ui/docs/COMPONENTS.md`](../../packages/ui/docs/COMPONENTS.md).
