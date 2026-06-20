# Layouts

> **Quick-glance index of `ui/layouts`.** Page-level scaffolds — full-page frames and app shells that compose `ui` primitives into the outer structure of a route. The families split across the two tiers ([`../REFERENCE.md`](../REFERENCE.md) §2): `AuthLayout` and the `StackedLayout` family are **static** (server-renderable); `DashboardLayout` and the `SidebarLayout` family are **client** components.

```ts
import { AuthLayout, SidebarLayout, StackedLayout } from 'ui/layouts'
```

## `AuthLayout` — unauthenticated pages

Static frame for sign-in, registration, and other single-card pages.

| Export | Summary |
|---|---|
| `AuthLayout` | Full-viewport layout that centres its content on both axes; the frame for unauthenticated single-card pages. |

## `StackedLayout` — vertical page scaffold

Static scaffold: a min-height-collapsing column with fixed-height ends around a flexing, scrolling body.

| Export | Summary |
|---|---|
| `StackedLayout` | Vertically stacked page scaffold hosting the header, body, and footer slots; the body flexes and scrolls between fixed-height ends. |
| `StackedLayoutHeader` | Fixed-height header slot (`data-slot="header"`). |
| `StackedLayoutBody` | Flexible, vertically scrolling main slot taking the height between header and footer (`data-slot="body"`). |
| `StackedLayoutFooter` | Fixed-height footer slot (`data-slot="footer"`). |

## `DashboardLayout` — stacked content with a filter rail

Client layout building on `StackedLayout` with a responsive filter rail.

| Export | Summary |
|---|---|
| `DashboardLayout` | Stacked content layout with a responsive filter rail — filters sit beside the main column on desktop and collapse into an offcanvas drawer on mobile. |

## `SidebarLayout` — sidebar app shell

Client app shell: a desktop sidebar, a mobile drawer-and-navbar, and a content region.

| Export | Summary |
|---|---|
| `SidebarLayout` | App shell: a desktop sidebar (inline, or a hover-revealed floating sheet), a mobile drawer-and-navbar, and a density-aware content region. |
| `SidebarLayoutHeader` | Header slot; surfaces the layout's `actions` inline on desktop (`data-slot="header"`). |
| `SidebarLayoutBody` | Scrolling main slot (`data-slot="body"`). |
| `SidebarLayoutFooter` | Footer slot (`data-slot="footer"`). |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`../REFERENCE.md`](../REFERENCE.md) §2. Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
