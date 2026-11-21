# Events roadmap

> **Goal: a trail that an app can send to its tracker with no secret in it, and that shows the requests before a bug.** The store records each event of the page, and the error channels of the framework say which events are bugs. The next steps close the gap in the network source, and put gates on the invariants that only prose holds now.

## Status

The store keeps one list of events. An event with a report is a bug or a capture, and the Bugs tab shows the events with a report. So a bug is an event, and the events stay the primary list.

The module does not guess what a bug is. A bug comes from a channel that the framework gives:

- The root callbacks of React (`eventsRootOptions`).
- The error callback of a router.
- The `error` and `unhandledrejection` events of `window`.
- `reportBug`, for a boundary of the app.

A thrown value that two channels report adds to the first report, and adds no event. The same text with the same first frame counts in the first report. A response under 500 that a route throws is an event, not a bug. [`events-store.test.ts`](../../__tests__/modules/events-store.test.ts) and [`events-recorder.test.ts`](../../__tests__/modules/events-recorder.test.ts) hold these rules.

Capture is a switch. While it runs, the store keeps each event through a reload, and "Preserve" stays on. Stop files a report that holds each event from the start of the capture.

The trail masks each secret field, by one rule (`isSecret` in [`events-target.ts`](engine/events-target.ts)). A secret field is one of these:

- An `input[type="password"]` or a `PasswordInput`.
- An input with the `autocomplete` token `cc-number`, `cc-exp`, `cc-csc`, or `one-time-code`. These are the three parts of `CreditCardInput` and the code field of a two-step form.
- An `input` or a `textarea` in an element with the `data-events-mask` attribute, or with the attribute itself.

The value of a secret field shows as `***`, which has a fixed length, and so does each key that types a character into it. A named key, such as `Enter` or `Tab`, stays, so the trail still shows a submit (#3492). The rule does not find a secret by its content. Thus the trail shows the value and the keys of a secret field with no listed token and no `data-events-mask`. The app must put the attribute on that field or on its form.

An app can send a report to its own issue tracker. It gives a port, `sendReport`, to `startEvents`. The port gets the title of the report, the Markdown text that Copy writes, and a copy of the report. Thus a send gives no data that Copy does not give. The view of a report then shows Send after Copy and Delete.

While the send runs, Send shows the loading state and keeps the focus. Then it shows "Sent" or "Send failed", and the live region speaks the result. A press on "Send failed" sends again. A report that the tracker holds does not go again in the same page load. The state of a send stays through a close of the view. [`events-send.test.ts`](../../__tests__/modules/events-send.test.ts) holds the send.

The view is one header button and one sheet with the Events and Bugs tabs. While the sidebar layout is inline, Pin docks the view on the end edge of the page, in the `aside` slot of `SidebarLayout`. The pinned panel shows each event as it comes in, and renders one time for each frame at most.

Each adapter lives in its consumer, so `ui` has no dependency on a framework or a tracker. The adapter of React Router lives in the docs app ([`router.ts`](../../docs/debug/router.ts)). Each app on Next.js starts the events in its own `instrumentation-client.ts`. The route source (`onRouterTransitionStart`) and the error page that calls `reportBug` are in `packages/shared`. `postReport` posts a report to an endpoint of the app. `readReportExport` of `ui/server` reads it there, so the token of the tracker stays on the server. The docs app gives a demo port that writes the report to the console, and fails while the browser is offline ([`report.ts`](../../docs/debug/report.ts)).

No app gives a `sendReport` port yet. Picks and Places render `EventsButton` and `EventsSwitch`. Elections and Numbers call `startEvents` but render no switch, so a reader there cannot turn the events on.

## Engine

The store, the sources, the sink, the report, and the recorder are in [`engine/`](engine). The engine has no `'use client'`, no runtime import of `react`, no runtime import from the module root, and no `index` barrel. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds this rule for the events engine and the other engines.

The barrel exports only the light modules: the setting, the sink, the shells of the views, and `postReport`, which imports only types. The recorder, the sources, and the store load only while the events run, through the `import()` in `events-setting.ts`. Thus an app that does not turn on the events loads no part of the recorder. [`events-lazy-boundary.test.ts`](../../__tests__/boundary/events-lazy-boundary.test.ts) holds this rule. It walks the runtime imports from the barrel and from `server/root-marks.ts`, and fails on a path to the recorder, the store, a source, the sheet, or the panel.

## Features

1. **Requests in the network source (*P2*).** The network source ([`network.ts`](engine/events-sources/network.ts)) records only the loads of a script or a link. A request through `fetch` or `XMLHttpRequest` writes no line, but a failed `/api/*` request is a common cause of a bug in the apps (CONVENTIONS.md §6.4). Sentry and LogRocket record each request in their breadcrumbs. The resource timing of the browser gives the request with no patch, through the `fetch` and `xmlhttprequest` initiator types. Write the path with no query, because a query can hold a token, then the duration and the status where the browser gives it. Keep the batch rule of a pass. The source tests in Accessibility and testing 4 prove it.

2. **A filter on the Events list (*P2*).** The list holds up to 500 events, or 2,000 while a capture runs, and has no filter. The Console of Chrome DevTools and the breadcrumbs of Sentry filter by kind and by text. Add a kind select and a text field to the actions of the Events tab in [`use-events-view.tsx`](use-events-view.tsx). Apply the filter to the events before `groupRows`, so a batch stays whole. Copy writes the rows that the list shows. A case in [`events-sheet.test.tsx`](../../__tests__/modules/events-sheet.test.tsx) filters a list and copies it.

3. **Long animation frames in the paint source (*P3*).** A long frame before a bug is a clue that the trail does not show. The paint source ([`paint.ts`](engine/events-sources/paint.ts)) can observe `long-animation-frame` through `observe`, which skips an entry type that the browser does not support. Sentry records long tasks as spans. Open question: the floor of a line, because each long frame at 50 ms can fill the store on a slow device.

4. **Console errors and warnings as an option (*P3*).** Sentry records `console.error` and `console.warn` as breadcrumbs, and a library often warns there before it fails. A `console` option of `startEvents` can patch the two methods, as `calls` patches the scroll and focus methods. The option is off by default for the same reason. Open question: `eventsRootOptions` calls `console.error` for a caught error, so the source must skip the error that the store already filed.

## Pattern cleanup

1. **Verb names in the engine (*P2*).** CONVENTIONS.md §8.5 starts each function name with a verb. Some file-private and shared functions of the engine have a noun name. They are `bursts` in [`dom.ts`](engine/events-sources/dom.ts), `key` in [`events-store.ts`](engine/events-store.ts), `block` and `row` in [`events-report.ts`](engine/events-report.ts), and `local` in [`events-setting.ts`](engine/events-setting.ts). Rename them to `createBursts`, `toKey`, `formatBlock`, `formatTableRow`, and `getLocal`. The rename of `bursts` reaches the docs sources ([`sources.ts`](../../docs/debug/sources.ts)). No gate is practical, because a verb list is open.

## Performance

No item is open, because no measured cost moves a frame. The Events section of [`browser/README.md`](../../__benchmarks__/browser/README.md) holds the figures of 2026-10-20 from [`events-tap.bench.tsx`](../../__benchmarks__/browser/events-tap.bench.tsx) and [`events-store.bench.ts`](../../__benchmarks__/events-store.bench.ts). A tap costs about 0.2 ms with the events on and 0.7 ms during a capture, against 0.02 ms off. The two fixes that the section measured have landed. They are the scroll region of the pinned panel, and the probe of the viewport that stays in the page. With them, a frame of the pinned panel costs about 4 ms, and a resize costs what it costs with the events off. Run both benches again before a change to the store, a source, or the list.

## Accessibility and testing

1. **States in the name of the header button (*P2*).** `EventsButton` shows a capture only as a red icon, and a filed report only as a dot. Its name stays "Events" in each state. This breaks WCAG 2.2 1.4.1 for the capture, and a screen reader does not hear either state. Forced colors also remove the red. Show a second glyph while a capture runs, by the root attribute, as the dot does. Put hidden text in the name for each state, which the same attributes show, in place of the fixed `aria-label`. A browser test reads the accessible name and the glyph in each state, under forced colors too.

2. **One action for each report row (*P2*).** In [`events-report-list.tsx`](events-report-list.tsx), the row is a `button` (`ListItem` with `onClick`) that opens the report. Its View button does the same action, so the keyboard stops two times for one action. Its `ListX` glyph also reads as a removal. Remove the View button and its `viewReport` message, and keep Copy and Delete. The case that opens a report from its row in `events-sheet.test.tsx` holds the action.

3. **Corpus subjects for the views (*P2*).** No entry of [`a11y/cases`](../../__tests__/a11y/cases) renders `EventsButton`, the open sheet, or `EventsSwitch`. So the baseline, the focus, and the trap sweeps do not reach them (CONVENTIONS.md §10.5). Add the subjects. Open question: the sheet loads in a chunk after a press, so the harness must load it at collection (CONVENTIONS.md §10.14).

4. **Tests for the network and viewport sources (*P2*).** No case drives the network source, or the `resize` and `height` sources of [`viewport.ts`](engine/events-sources/viewport.ts). The `paint` case of `events-recorder.test.ts` stubs `PerformanceObserver` and gives it entries, which is the seam of CONVENTIONS.md §10.3. Use the same stub for the network source: the cache mark, a failed status, and the batch of a pass. Dispatch `resize` events for the viewport sources, and assert one batch for a burst.

## Not planned

- A DOM replay, as rrweb, Sentry Replay, and LogRocket record. The trail is text by design. A DOM record costs the input path, and it holds the content of the page, which a mask of the fields does not bound.

- A screenshot in a report. It needs a renderer such as html2canvas, and it holds the content of the page, which the tracker of the app then keeps.

- A bug from a heuristic, such as a rage click or a slow frame. The module does not guess what a bug is, so a heuristic can record an event but never file a report.

- An adapter for a tracker in `ui`. The app gives `sendReport`, so `ui` has no dependency on a tracker, and the token stays on the server of the app.

- A ring buffer for the store. Each `add` copies the list, which costs 0.054 ms at 2,000 events in jsdom (2026-10-20, `events-store.bench.ts`). `useSyncExternalStore` needs a new list for each change in any case.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md) · [`browser/README.md`](../../__benchmarks__/browser/README.md) (the Events section).
