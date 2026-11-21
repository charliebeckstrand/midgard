# Events roadmap

> **Goal: an events module that an app can turn on to see what happened before a bug, and to file the bug with its trail.** The store records each event of the page. React and the router of the app say which events are bugs. This file tracks the module one measured piece at a time.

## Status

The first version replaces the Event log and the Bug log of the docs. The store keeps one list of events. An event with a report is a bug or a capture, and the Bugs tab shows the events with a report. So a bug is an event, and the events stay the primary list.

The module does not guess what a bug is. A bug comes from a channel that the framework gives:

- The root callbacks of React (`eventsRootOptions`).
- The error callback of a router.
- The `error` and `unhandledrejection` events of `window`.
- `reportBug`, for a boundary of the app.

A thrown value that two channels report adds to the first report, and adds no event. A response under 500 that a route throws is an event, not a bug.

Capture is a switch. While it runs, the store keeps each event through a reload, and "Preserve" stays on. Stop files a report that holds each event from the start of the capture.

The trail holds no secret. A password field is an `input[type="password"]` or a `PasswordInput`. Its value shows as `***`, which has a fixed length, and so does each key that types a character into it. A named key, such as `Enter` or `Tab`, stays, so the trail still shows a submit (#3492).

An app can send a report to its own issue tracker. It gives a port, `sendReport`, to `startEvents`. The port gets the title of the report, the Markdown text that Copy writes, and a copy of the report. Thus a send gives no data that Copy does not give, and the trail masks each password value. The view of a report then shows Send after Copy and Delete.

While the send runs, Send shows the loading state and keeps the focus. Then it shows "Sent" or "Send failed", and the live region speaks the result. A press on "Send failed" sends again. A report that the tracker holds does not go again in the same page load, so a second press files no duplicate. The state of a send stays through a close of the view.

The view is one header button and one sheet with the Events and Bugs tabs. While the sidebar layout is inline, Pin docks the view on the end edge of the page, in the `aside` slot of `SidebarLayout`. The pinned panel shows each event as it comes in.

Each adapter lives in its consumer, so `ui` has no dependency on a framework. The adapter of React Router lives in the docs app ([`../../docs/debug/router.ts`](../../docs/debug/router.ts)). Each app on Next.js starts the events in its own `instrumentation-client.ts`. The route source (`onRouterTransitionStart`) and the error page that calls `reportBug` are in `packages/shared`. The adapter of an issue tracker lives in the app too. `postReport` posts a report to an endpoint of the app, and `readReportExport` of `ui/server` reads it there, so the token of the tracker stays on the server. The docs app gives a demo port that writes the report to the console, and fails while the browser is offline ([`../../docs/debug/report.ts`](../../docs/debug/report.ts)).

## Engine

The store, the sources, the sink, and the recorder are in [`engine/`](engine). The engine has no `'use client'`, no runtime import of `react`, and no `index` barrel. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds this rule for the events engine and the other engines.

The barrel exports only the light modules: the setting, the sink, and the shells of the views. The recorder, the sources, and the store load only while the events run. Thus an app that does not turn on the events loads no part of the recorder.

## Backlog

The backlog is empty.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
