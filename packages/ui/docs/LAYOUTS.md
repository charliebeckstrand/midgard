# Layouts

> **Quick-glance index of `ui/layouts`.** Page-level scaffolds: full-page frames and app shells that compose `ui` primitives into the outer structure of a route. The families split across the two tiers ([`../REFERENCE.md`](../REFERENCE.md) §2): `AuthLayout` and the `StackedLayout` family are **static** (server-renderable); `DashboardLayout` and the `SidebarLayout` family are **client** components.

```ts
import { AuthLayout, SidebarLayout, StackedLayout } from 'ui/layouts'
```

Each export ships its `<Name>Props` type beside it. Per-layout behavior, props, and defaults live in the TSDoc.

## `AuthLayout`: unauthenticated pages

Static frame for sign-in, registration, and other single-card pages.

| Export | Summary |
|---|---|
| `AuthLayout` | Full-viewport layout that centers its content on both axes; the frame for unauthenticated single-card pages. |

## `StackedLayout`: vertical page scaffold

Static scaffold: a min-height-collapsing column with fixed-height ends around a flexing, scrolling body.

| Export | Summary |
|---|---|
| `StackedLayout` | Vertically stacked page scaffold hosting the header, body, and footer slots; the body flexes and scrolls between fixed-height ends (`data-slot="stacked-layout"`). |
| `StackedLayoutHeader` | Fixed-height header slot (`data-slot="header"`). |
| `StackedLayoutBody` | Flexible, vertically scrolling main slot taking the height between header and footer (`data-slot="body"`). |
| `StackedLayoutFooter` | Fixed-height footer slot (`data-slot="footer"`). |

## `DashboardLayout`: stacked content with a filter rail

Client layout building on `StackedLayout` with a responsive filter rail.

| Export | Summary |
|---|---|
| `DashboardLayout` | Stacked content layout with a responsive filter rail. Its `layout` sets the place of the filters at each breakpoint. An `inline` layout puts them beside the main column. A `drawer` layout puts them in an offcanvas drawer that a button opens. The default is a drawer on a compact or a medium viewport, and inline when expanded (`data-slot="dashboard-layout"`). |

## `SidebarLayout`: sidebar app shell

Client app shell: an inline sidebar or a drawer-and-navbar, and a content region.

| Export | Summary |
|---|---|
| `SidebarLayout` | App shell: an inline sidebar (a panel, or a hover-revealed floating sheet) or a drawer-and-navbar, and a density-aware content region. Its `layout` chooses at each breakpoint: a drawer on a compact or a medium viewport, and inline when expanded. The Sidebar setting of `AppearanceProvider` selects the inline sidebar. The `locked` sidebar is a panel, and the `offcanvas` sidebar is a floating sheet. The ⌘B or Ctrl+B key toggles it one time for each press. The page scrolls at each width: under a sticky navbar in the drawer layout, and beside a sticky panel in the inline layout. The height of the bar that sticks is the top `scroll-padding` of the scroller. A scroll into view, an anchor, and a `Lightbox` flight keep clear of the bar. The sidebar sits on the start edge. An optional `aside` panel sits on the end edge in the inline layout. It is sticky and as tall as the viewport, as the pinned panel of the events is. |
| `SidebarLayoutHeader` | Header slot; surfaces the layout's `actions` in the inline layout (`data-slot="header"`). |
| `SidebarLayoutBody` | Main slot (`data-slot="body"`); scrolls with the page at each width. |
| `SidebarLayoutFooter` | Footer slot (`data-slot="footer"`). |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`../REFERENCE.md`](../REFERENCE.md) §2. Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
