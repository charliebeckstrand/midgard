# Server

> **Quick-glance index of `ui/server`.** Functions that run on a server: in a Next.js server module, the server of an app (`shared/server`), or the docs server. Each file is plain TypeScript. It renders no React, and it has no `'use client'`. Code that waits for hydration in the browser is in `ui/hooks` (`useHydrated`). CONVENTIONS §3.13 gives the rules of the first paint.

```ts
import { markRoot, rootMarks } from 'ui/server'
```

## Stored settings on the root element

| Export | Summary |
|---|---|
| `rootMarks` | The classes and the attributes of the root element for the stored settings of the reader in a `Cookie` header. |
| `markRoot` | Writes `RootMarks` on the opening tag of the root element of an HTML string. |
| `hasRootTag` | Whether an HTML string holds the whole opening tag of the root element. A server that streams a page marks it after this is true. |
| `RootMarks` *(type)* | The classes and the attributes that `rootMarks` gives. |

## Date text

| Export | Summary |
|---|---|
| `formatDateText` | Writes the text of a date, or of a span of dates, on the server in a set time zone. The browser shows that text, so the first paint shows the date and hydration does not write it again. |
| `DateText` *(type)* | An instant and the text that the server wrote for it. `DateTime` takes it as its `value`. |

## Events reports

| Export | Summary |
|---|---|
| `readReportExport` | Reads the report that `postReport` of `ui/events` posts, in a route handler. It keeps only the known fields of a report, so the tracker gets no field that a client added. |
| `ReportExportError` | The error of a body that `readReportExport` does not take. Its `status` is 400 for a body that is not a report, and 413 for a body that is too large. |
| `ReadReportOptions` *(type)* | The options of `readReportExport`: `maxBytes`, the largest body that it takes (1 MiB by default). |

The route files the report in the tracker of the app with a token that stays on the server. [`MODULES.md`](MODULES.md) gives the two ends of a send.
