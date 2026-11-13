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
