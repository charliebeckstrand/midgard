# Events roadmap

> **Goal: an events module that an app can turn on to see what happened before a bug, and to file the bug with its trail.** The store records each event of the page. React and the router of the app say which events are bugs. This file tracks the module one measured piece at a time.

## Status

The first version replaces the Event log and the Bug log of the docs. The store keeps one list of events. An event with a report is a bug or a capture, and the Bugs tab shows the events with a report. So a bug is an event, and the events stay the primary list.

The module does not guess what a bug is. A bug comes from a channel that the framework gives: the root callbacks of React (`eventsRootOptions`), the error callback of a router, the `error` and `unhandledrejection` events of `window`, and `reportBug` for a boundary of the app. A thrown value that two channels report adds to the first report, and adds no event. A response under 500 that a route throws is an event, not a bug.

Capture is a switch. While it runs, the store keeps each event through a reload, and "Preserve" stays on. Stop files a report that holds each event from the start of the capture.

The view is one header button and one sheet with the Events and Bugs tabs. From `lg` up, Pin docks the view on the end edge of the page, in the `aside` slot of `SidebarLayout`. The pinned panel shows each event as it comes in.

Each adapter lives in its consumer, so `ui` has no dependency on a framework. The adapter of React Router lives in the docs app ([`../../docs/debug/router.ts`](../../docs/debug/router.ts)). Each app on Next.js starts the events in its own `instrumentation-client.ts`, and the route source (`onRouterTransitionStart`) and the error page that calls `reportBug` are in `packages/shared`.

## Engine

The store, the sources, the sink, and the recorder are in [`engine/`](engine). The engine has no `'use client'`, no runtime import of `react`, and no `index` barrel. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds this rule for the events engine and the other engines.

The barrel exports only the light modules: the setting, the sink, and the shells of the views. The recorder, the sources, and the store load only while the events run. Thus an app that does not turn on the events loads no part of the recorder.

## Backlog

- **Report export.** Let an app send a report to its own issue tracker, in addition to Copy.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
