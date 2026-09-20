# PDF Viewer — Region Highlights — Feature Plan — 2026-08-26

What `<PdfViewer>` has to grow to serve a document-review screen, and the order it can grow in. The viewer today answers *"show me this document."* A review screen asks a second question — *"show me **this part** of it, and let me point at that part from outside the viewer"* — and that question is the whole of this plan.

No new dependency: `pdfjs-dist` is already a package dependency, and every addition below is geometry the viewer can already compute.

## Scope discipline

`PdfViewer` had **no consumer in the tree** when this was written — nothing in `apps/` rendered it — and the screen driving this request was a scaffold whose own doc comment said the contract was unspecified (`apps/tms/src/app/(app)/(shell)/ap/workspace/review/review-body.tsx`: "the invoice detail endpoint is exactly what is still unspecified"). Every prop added here is permanent: `@reconex/ui/pdf-viewer` is a public subpath, so widening a union or adding a prop later is non-breaking, and removing one is not.

So this plan ships the **minimum that the mechanism itself proves**, and names what it is deliberately leaving for the app code that forces it. Five new props, two new exported types. An earlier draft of this plan carried nine props and four types; the difference was all prediction about a screen nobody has written yet.

Deferred until a real consumer forces the shape, with the reason each is a guess:

- **A decorative (non-interactive) region mode.** The driving screen labels and clicks every region. Until something wants inert paint, `label` is required and interactivity rides `onActiveHighlightChange` — the same rule the map module already uses (`modules/map/map-plat.tsx` derives `pickable` from `onRegionClick !== undefined`, and `label` is required on every overlay mark).
- **Non-rectangular regions.** See *Geometry*, below.
- **Consumer-driven highlight visibility.** Internal state, like the two chrome toggles beside it.
- **`highlightUnit: 'point'` and `'pixel'`.** See *The unit*, below.
- **More than one accent colour per document.** See *Colour*, below.
- **`fit: 'page' | 'width'`.** Deferred here, then built once the AP review screen forced it — see *`fit: 'page' | 'width'` (shipped, separately)*.

## Driving consumer

The AP Workspace OCR-quality escalation screen. `GET /api/v1/invoicing/review/{id}` returns `extractionFields[]`, each carrying `confidence`, `wasBelowThreshold`, and `boundingRegionJson` — the raw Azure Document Intelligence `boundingRegions` array, `[{ pageNumber, polygon: [x1,y1,…,x4,y4] }]`, whose coordinates are **inches** when the analyzed source was a PDF.

A reviewer reads the field panel on the right and needs the low-confidence fields boxed on the page on the left, so they can see what the model misread before retyping it. Clicking a box selects its field; selecting a field boxes and reveals its region, on whatever page it lives on.

## Current state (verified in tree, 2026-08-26)

- **Props.** `pages?`, `src?`, `filename?`, `page?`/`defaultPage?`/`onPageChange?`, `defaultZoom?`, `zoomLevels?`, `className?`, `aria-label?`. Two input modes: caller-supplied pre-rendered `pages`, or `src` rasterized via pdf.js. `pages` wins when both are set.
- **Rasterization** (`use-pdf-viewer-document.ts`). `fetch(src)` → `arrayBuffer` → a same-origin blob URL for download/print → `getDocument({ data })` → **every page, sequentially, up front**, each rendered to a canvas at `scale = clamp(window.devicePixelRatio || 1, 1.5, 2)` and converted to a PNG blob URL. Each resolved page is `{ id, src, label, width: viewport.width, height: viewport.height }` — rasterized pixels at that internal scale, **not** a physical size. `setPages([...pages])` fires once per page as they land, so a 40-page document drives 40 whole-viewer renders during load.
- **Intrinsic size** (`use-pdf-viewer-page-size.ts`). `pageSize` = the caller's `width`/`height` when both are set, else the active page `<img>`'s natural size, reset on page change.
- **Layout** (`use-pdf-viewer-page-scale.ts`). `fitScale = min(viewportW/visW, viewportH/visH)`, then `scale = fitScale * zoom`, `imageWidth = pageSize.width * scale`, and `frameWidth`/`frameHeight` swap when transposed. `resolvePageAspectRatio` also puts the page's own ratio on the viewport as CSS `aspect-ratio`.
- **Paint** (`pdf-viewer-viewport.tsx` + `recipes/kata/pdf-viewer.ts`). The viewport is `overflow-auto` **on both axes**, safe-centers its content, capped at `max-h-[1280px]`. `page-frame` is `relative shrink-0`; the page `<img>` is `absolute top-1/2 left-1/2 origin-center` sized `imageWidth × imageHeight` with `transform: translate(-50%,-50%) rotate(<rotation>deg)`, its `visibility` gated on `visible = !!(viewportSize && pageSize)`.
- **State** is one memoized `PdfViewerResult` behind `createContext('PdfViewer')` — plain React context, **no selector** — with exactly three consumers: the toolbar, the thumbnail rail, and the viewport. Pagination is controllable through `useControllable`; the sidebar and mobile-sheet toggles are plain internal state with no props, and zoom ships `defaultZoom` with no controlled twin.
- **Tests** are six files in `src/__tests__/boundary/`: `pdf-viewer.test.tsx` plus one per hook (`use-pdf-viewer-document`, `-page-scale`, `-page-size`, `-pagination`, `-page-rotation`). The document suite deliberately omits the successful pdfjs path ("pending a rewrite that doesn't depend on the real async lifecycle"), and CONVENTIONS §11.3 forbids driving third-party async lifecycles in tests.
- **Docs.** `docs/COMPONENTS.md` indexes `pdf-viewer` by name under *Domain & specialized*; per-component props live in TSDoc. The demo (`src/docs/demos/components/pdf-viewer.tsx`, two examples) renders the viewer with no height constraint.

Two consequences of that geometry chain decide the API. First, **nothing outside the component can place a region**: `imageWidth`/`imageHeight` derive from a measured viewport, a per-page rotation and a user zoom, none of which are exposed. Second, **the page's physical size is discarded** — the raster keeps `viewport.width` at the internal scale, and the PDF's user-space size is thrown away.

## The unit

**Geometry is normalized page fractions** — `x`, `y`, `width`, `height` in `[0, 1]`, origin top-left, unrotated page space. Fractions are the only unit well-defined in **both** input modes (a rasterized page's pixels and a caller's pre-rendered image share no physical meaning) and the only one invariant under zoom, rotation and re-rasterization at a different device pixel ratio.

**The viewer also accepts inches and converts them**, via `highlightUnit`. The argument for that placement is *not* "only the viewer knows the page size" — that is an artifact of the current implementation discarding it, not a fact about ownership. The real argument is the precedent this package already sets for plot-bearing surfaces: `MapMarker` takes real-world `LngLat` and the plat owns the projection, rather than making every caller project into pixel space first. A viewer that renders a page in a scaled, rotated frame is the same shape, and inches are the unit its one known producer emits.

Two things follow, and both are stated here because the earlier draft got them wrong:

- **`'point'` and `'pixel'` are out.** Nothing described emits points, and `pt / 72` on the caller's side needs no viewer knowledge. Document Intelligence emits *pixels* when the analyzed source is an image rather than a PDF — so a three-member union calibrated on one code path would have been simultaneously over-broad and under-broad. Two members, and the conversion for anything else is one divide in the caller.
- **The conversion is an exported pure function**, `toFractionRect(rect, unit, pageExtent)`, not a private step inside a hook. It is the only seam where the arithmetic is provable without measuring a DOM (see *Tests*).

## Page extent

`PdfViewerPage` gains an optional physical size:

```ts
	/** Intrinsic page width in PDF user-space units (points, 1/72"). Enables `highlightUnit: 'inch'`. */
	pointWidth?: number
	/** Intrinsic page height in points. See `pointWidth`. */
	pointHeight?: number
```

Two rules about where these come from, because the earlier draft's answer coupled this feature to something the plan simultaneously declared out of scope:

**They come off the raster's own viewport: `viewport.width / scale`, which is exact.** An earlier draft of this plan called for a dedicated metrics pass over `doc.getPage(i).getViewport({ scale: 1 })` so that extents would exist before any image did, on the argument that sourcing them from the rasterizer makes the eager raster (see *Known cost*) load-bearing for inch conversion. That was built and then removed, because the pass did not deliver the property it was for: `appendRenderedPage` is still the only place a `PdfViewerPage` is constructed, so a page record — extent included — exists only once its image does, and a lazy raster would still find no divisor on a page it had not rendered. Meanwhile the pass cost N serialized `getPage` round trips ahead of the first pixel (measured: 4.2 ms at 14 pages, 30.6 ms at 500), and `getPage` is memoized by pdf.js, so it duplicated no work either.

The property is worth having; it belongs to the change that can observe it. Making extents survive a lazy raster means publishing the page list from a metrics pass and patching `src` onto existing records as images land — which also makes `total`, `safePage` and `activePage` stop being raster-progress-derived. That is the lazy-raster change's job, not this one's.

**The pair is `width`/`height`'s twin, and the invariant is unchecked.** After this change a page carries four numbers for one page: raster pixels (painted against) and points (measured against). They cannot disagree when the rasterizer sets both from the same `getViewport` call, but a caller supplying `pages` can set one and not the other, and a caller-supplied page with no point size makes `highlightUnit: 'inch'` inert *for that page*. That is a per-page dev warning, not a document-level one.

*Considered and not taken:* replacing both pairs with one `extent: { width, height, unit: 'px' | 'point' }`, which would let the type require an extent whenever a non-fraction unit is set. It is the better shape and a larger change to an existing public type than this feature justifies; recorded here so the next person touching `PdfViewerPage` sees it.

## API

Additions only. Nothing existing changes shape.

```ts
/** A highlighted region of the document, in the unit named by `highlightUnit`. */
export type PdfViewerHighlight = {
	/** Stable identity. The active-highlight binding and React keys both use it. */
	id: string
	/** 1-based page the region sits on. */
	page: number
	/** Axis-aligned bounding box, origin top-left. */
	rect: PdfViewerHighlightRect
	/** Accessible name, and the label the announcement speaks. Required — see `Colour` for why it, not the paint, carries the meaning. */
	label: string
	/**
	 * Decorative paint for this region, from the shared palette. Semantic meaning belongs
	 * in `label`, never in the colour.
	 * @defaultValue the viewer's default highlight colour
	 */
	color?: Color
}

export type PdfViewerHighlightRect = { x: number; y: number; width: number; height: number }
```

```ts
type PdfViewerHighlightProps = {
	/**
	 * Regions to draw over the pages. Only the active page's are rendered.
	 * Identity is not required to be stable — the viewer filters by page and converts at
	 * the point of use rather than memoizing a derived array off this reference.
	 */
	highlights?: readonly PdfViewerHighlight[]
	/**
	 * Unit for every highlight's `rect`. `'inch'` divides by the page's own
	 * `pointWidth`/`pointHeight` over 72; a page carrying neither renders none of its
	 * regions, and warns once in development. For points, pass `pt / 72`.
	 * @defaultValue 'fraction'
	 */
	highlightUnit?: 'fraction' | 'inch'
	/** Controlled active region id; `null` for none. */
	activeHighlightId?: string | null
	/** Initial active region id in uncontrolled mode. */
	defaultActiveHighlightId?: string
	/**
	 * Fires when the active region changes from inside the viewer — a click or
	 * `Enter`/`Space` on a region, or `Escape` clearing it. Not fired for a change the
	 * consumer drove itself. **Its presence is what makes regions interactive**, matching
	 * how the map module derives `pickable` from `onRegionClick`.
	 */
	onActiveHighlightChange?: (id: string | null) => void
}
```

`defaultActiveHighlightId` is `string`, not `string | null`: `useControllable`'s `defaultValue` is `T | (() => T)` and it normalizes with `?? undefined` internally, so a `null` default would carry no information and need a cast.

## Geometry

Only `rect` — an axis-aligned box. Document Intelligence emits a quadrilateral, so a polygon is the caller's to reduce, and that reduction is four `min`/`max` calls needing **no** viewer-side knowledge. That is the same test that put inch conversion *inside* the viewer: the divisor is the viewer's to know, a bounding box is not. Carrying both a required `rect` and an optional `points` would also have meant a prose invariant the type cannot express ("`rect` must contain `points`") whose only failure mode is a silently clipped polygon.

If a real skew complaint arrives, it lands as a **widening of the one field** — `rect: PdfViewerHighlightRect | readonly PdfViewerHighlightPoint[]` — with the bounding box derived internally, and the polygons drawn in one `<svg viewBox="0 0 1 1" preserveAspectRatio="none">` for the whole layer (1 + N nodes, page-fraction coordinates straight out of the conversion, `vector-effect="non-scaling-stroke"`), never one SVG per region.

## Rendering

The overlay is a **sibling of the page `<img>` inside `page-frame`**, absolutely centered, sized `imageWidth × imageHeight`, carrying the identical `translate(-50%, -50%) rotate(θ)` transform. That single decision is what keeps regions glued to the ink through zoom, rotation, resize and re-raster: the overlay and the image are the same box under the same transform, so a region positioned in percentages lands on the same ink at every scale, with no per-region math.

The transform string is **computed once in `usePdfViewerPageScale`**, beside `frameWidth`/`frameHeight`, and read by both the image and the layer. Hand-writing it twice would make "the two copies agree" a thing tests have to assert, which is the signature of a missing extraction.

Each region positions in **percent** — `left: x·100%`, `width: w·100%` — so a zoom change is a browser rescale rather than a React render.

Three rules keep the layer off the hot paths:

- **Only the active page's regions render.** One pass filters `h.page === safePage` and converts only the survivors; nothing materializes a converted array for the whole document. A 300-region packet converts the ~30 on screen, not all 300, and there is no derived array identity to leak into a context value. The default `'fraction'` path is a pass-through.
- **The layer is gated on `visible`**, the boolean the image's `visibility` already reads. Before the first measure `imageWidth` is `undefined`; without the gate the layer mounts every region at size 0 and re-renders them at the measured size — multiplied by the 40 whole-viewer renders a 40-page load produces.
- **One delegated handler on the layer**, reading the region id off a data attribute, rather than a closure per region. The thumbnail rail already addresses its items by selector this way.

## State placement

Activation is the review screen's primary interaction, and the context is plain React context with no selector, so putting the active id in the one memoized `PdfViewerResult` would re-render all three consumers on every click — including the thumbnail rail, which renders five nodes per page and is not memoized, and the toolbar, which allocates a `ListboxOption` pair per page. Neither cares about the active region.

So the state splits by who reads it:

- **The existing context** keeps `hasHighlights` and `highlightsVisible` — booleans that change at most once per document or per toggle, which is what the toolbar needs. A boolean, never the array: an array identity flips every render.
- **A second, narrower provider inside `k.body`, wrapping only `<PdfViewerViewport />`**, owns the active id (`useControllable`), the per-page filtering and the reveal. The toolbar and rail sit outside it and physically cannot re-render on activation — no `memo`, no store, no subscription.

If per-region granularity is ever needed, the package's existing shape for it is the form module's split store (`components/form/use-form-store.ts` + the `FormStoreContext`/`FormActionsContext` pair): "typing in one field does not re-render its siblings" is the same sentence with *activating one region* substituted.

## Behavior

**Activation.** Clicking a region, or `Enter`/`Space` on a focused one, makes it active and calls `onActiveHighlightChange`. `Escape` clears it.

**Reveal.** When the active id changes — from a click *or* from the consumer setting `activeHighlightId`, which is how the field panel drives it — the viewer navigates to that region's page through the existing `goToPage`, then brings the region into view.

Three things about the reveal, all of them corrections to an earlier draft:

- **Use `scrollWithin` from `useScrollWithin`, not `element.scrollIntoView`.** The rail beside it already does, because native `scrollIntoView` walks every ancestor scroller and would yank the whole review screen when the viewer sits inside `DetailsDrawer`. `scrollWithin` finds the first *overflowing* ancestor, stops at any `overflow: hidden|clip` boundary, and its default `block: 'nearest'` returns without writing when the node is already fully visible.
- **Attach it as a callback ref on the active region**, the idiom `pdf-viewer-thumbnail-list.tsx` uses (`ref={isCurrent ? scrollCurrentIntoView : undefined}`). The ref fires on the becoming-active edge, after the region has mounted at its measured size — which resolves the two-phase problem for free: on a cross-page activation the region does not exist during the navigating render, and `pageSize` has just been reset to `null`, so an effect firing then would find a 0×0 frame and silently no-op. Carry `use-nav-item.ts`'s `scrolledRef` latch with it, for the reason documented there: StrictMode replays layout effects for fibers that merely moved.
- **`scrollWithin` is vertical-only** (`overflowY`, `scrollTop`, `scrollHeight > clientHeight`), and this viewport is `overflow-auto` on **both** axes — above fit a region can be off-screen horizontally. Adding an `inline` axis to the shared hook is the house-consistent fix and is part of this change; growing a private two-axis scroller inside the highlights hook is not.

**Reduced motion** reads `useReducedMotion()` from `motion/react`, as twelve other sites do, or `useMediaQuery('(prefers-reduced-motion: reduce)')`. Not `prefers-reduced-motion: no-preference` — `reduce` and `no-preference` are not complements, so the negated spelling silently diverges from every other motion gate in the package.

**Visibility.** A `ToggleIconButton` in the toolbar (it already owns the controllable pressed state and emits `aria-pressed`) hides the layer with a `hidden` attribute rather than unmounting it, and appears only when `hasHighlights`. Hiding does not clear the active id. The state is internal, beside `sidebarOpen` and `thumbsOpen` — the two chrome toggles this component already keeps out of its props.

## Accessibility

- Every region is a `<button type="button">` with `aria-label={label}` and `aria-current="true"` when active. `aria-current`, not `aria-pressed`: activating a region is selection among siblings, not a toggle. The visibility control is the one toggle here, and the one thing carrying `aria-pressed`.
- **The layer is one tab stop, not N.** `useA11yRoving(layerRef, { itemSelector, manageTabIndex: true, activeSelector: '[aria-current="true"]' })` — the same hook the thumbnail rail next door uses. A dense invoice is 20–40 regions; without roving they would be the only same-kind visual marks in the package to each take their own stop, and they would duplicate the 40 panel rows beside them. `useEscapeLayer` or `usePlotTabStop` owns the `Escape` clear, including reclaiming the following `Tab`.
- **Announce through `useA11yAnnouncements`, not `useA11yLiveRegion`.** The latter returns only a props bag for a rendered region, and its own TSDoc says to use the former for imperative announcements. It matters here beyond tidiness: the viewport already mounts a live region whose content *is* "Page X of Y", and an activation that moves the page would mutate both in one commit. The message is the region's `label` alone — the page change already speaks for itself.
- The focus ring comes from `sen.focus`, whose offset-gap reasoning is written for exactly this case ("the stroke reads against the element's own fill even when the fill IS the accent colour"). The open question is `focus.ring` versus `focus.inset`: this viewport is `overflow-auto`, and the grid kata records that an overflow container clips an outset outline at its edge. Decide on the clip, not by copying the rail — whose ring is a hand-written `after:` pseudo-element with a literal `blue-600`.

## Colour

`color?: Color` — the package's decorative palette (`zinc | red | amber | green | blue`), not a new severity axis.

The earlier draft minted `PdfViewerHighlightTone = 'default' | 'info' | 'success' | 'warning' | 'critical'`, which was wrong three ways. The canonical feedback quartet is `AlertSeverity = 'info' | 'success' | 'warning' | 'error'` and `'critical'` appears nowhere in the package, so it would have been a fifth spelling requiring translation at every boundary. The API-consistency audit's still-open rows say the axis named `tone` is for text and `severity` is reserved for the quartet — the draft swapped them — and that mixing a style word like `'default'` into a severity axis is the same defect it already tracks on `ToastSeverity`. And a five-member semantic axis contradicts this plan's own accessibility rule that the region's meaning is its `label`: if the colour carries no meaning, it is decoration, and decoration in this package is `color?: Color`.

`Timeline` already resolved the semantic-versus-decorative fork for a near-identical mark, as mutually exclusive `status` XOR `color`. This takes only the half the feature needs; the semantic half is available later without a rename.

## Recipe surface

`recipes/kata/pdf-viewer.ts` gains a `viewport.page.highlights` group — `layer`, `region.base`, `region.active`, and the per-colour paint **read from `iro` by key**, not hand-written: `soft.bg` is already `bg-{color}-500/15` per palette colour (a translucent fill), and `outline.ring` is the matching ring, both `mode()`-paired for dark. Four object-literal katas already read `iro` this way (`status`, `timeline`, `loading`, `calendar`).

This is not a style preference. The contrast test re-derives ratios from Tailwind's own theme for the `iro` ramps, so tokens are covered by that guard and literals are not — hand-writing the pairs would ship this plan's legibility promise unverified. It also avoids a third copy of the amber highlight wash, which already exists twice (`kata/json-tree.ts` and `kata/grid.ts`) with a comment saying the sharing is deliberate "so a match reads the same across the system".

## Tests

The seams matter more than the count: jsdom reports `clientWidth` 0, so `fitScale` collapses and anything asserted through measured layout needs `__tests__/helpers/mock-dom-geometry.ts`.

**`toFractionRect` (new unit test).** The whole of the unit arithmetic, tested directly as a pure function: fraction pass-through, inch conversion against a known page extent, and a missing extent returning nothing. This is where the earlier draft's untestable case ("on a page without point sizes it renders nothing and warns once") becomes provable — it was untestable only because the conversion was buried in a hook fed by the rasterizer.

**`use-pdf-viewer-highlights.test.ts` (new).** Filtering to the active page; the controllable active id in both modes; an `activeHighlightId` matching no region being a no-op; the page navigation an off-page activation triggers.

**`pdf-viewer.test.tsx`.** A region renders as a button with its label; clicking one fires `onActiveHighlightChange` and marks it `aria-current`; regions are absent without `onActiveHighlightChange`; the layer is one tab stop; the toggle appears only with regions, hides the layer, and preserves the active id; **activating a region does not re-render the toolbar or the thumbnail rail** — the guard for the state split above, and the form suite's "re-renders only the typed field, not its siblings" is the precedent for writing it.

**Not written:** the earlier draft's `use-pdf-viewer-document.test.ts` case asserting a rasterized page's point size. That suite deliberately omits the successful pdfjs path, and CONVENTIONS §11.3 forbids driving pdfjs's async lifecycle in a test. The metrics pass is covered where it is observable — through the demo, and through `toFractionRect` given an extent.

**The demo is part of the change**, not an afterthought: with no consumer in the tree and no measurable layout in jsdom, `src/docs/demos/components/pdf-viewer.tsx` was the only place this geometry was exercised at all. One example with regions on a real multi-page PDF, one driving `activeHighlightId` from a list beside the viewer.

## Increments

Increments 1-4 are **shipped**; what the build changed about the plan is recorded under *As built*, below.

1. **Page extent (shipped).** The metrics pass and `pointWidth`/`pointHeight` on `PdfViewerPage`, plus `toFractionRect` and its test. Invisible on its own; everything below depends on it.
2. **The overlay and its active binding (shipped).** Types, `highlights`, `highlightUnit`, the narrow provider, the layer, roving, reveal, the announcement, the recipe group, the demo. One increment rather than two: with `label` required and interactivity riding `onActiveHighlightChange`, there is no inert shape to stage — and staging one would have meant publishing `label` with no behavior and changing what it does in the next release.
3. **`useScrollWithin` gains an `inline` axis (shipped).** Separable, and the reveal is correct-but-vertical-only until it lands. Carries a `docs/HOOKS.md` update.
4. **Visibility toggle (shipped).** The `ToggleIconButton` and the internal state.

Named so they are not mistaken for oversights:

5. **`onDocumentLoad`.** For page-count-dependent chrome outside the viewer — not for unit conversion. Note it needs rethinking under a lazy raster, which has no single load moment.
6. **Thumbnail region markers.** A dot on a thumbnail whose page carries regions. Needs per-page grouping in the main context (a boolean per page, not the array), which is why `hasHighlights` lives there.
7. **Extract the transformed page surface.** `pdf-viewer-page.tsx` owning `page-frame`, the image, the transform and every co-transformed layer, leaving the viewport with measurement and the loading/error/empty branch. Not required by this change now that the transform is computed once, but the text layer below is a third co-transformed layer, and without the extraction that increment becomes a viewport rewrite.
8. **Text layer.** pdf.js text-layer rendering for selection and copy — a reviewer correcting a misread field would rather copy the printed value than retype it. Its own plan; depends on 7.

## The component could not be built by webpack (fixed)

`configureWorker` resolved pdf.js's worker through
`import('pdfjs-dist/build/pdf.worker.min.mjs?url')` — a Vite-only query, and webpack resolves
an `import()` specifier statically whether or not the call is reachable, so merely rendering
`PdfViewer` broke the build of any webpack app. Found by trying to use it from the Next app,
which is the first consumer this component has ever had; neither the design-system tests nor
the Vite docs site can see it.

The replacement is `new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url))`,
the one form both bundlers recognise and emit as an asset. Two further turns of the same screw
followed from review:

- **The worker is created once per realm and handed to `getDocument` as `worker`**, not
  published on `GlobalWorkerOptions.workerPort`. Both give one thread per page rather than one
  per load, but a global port is one pdf.js caches and half-tears-down: `loadingTask.destroy()`
  marks the *cached* worker pending-destroy, and a `getDocument` before that round-trip
  completes throws. That window is reachable here — minimize the drawer mid-rasterization, then
  restore. pdf.js never destroys a worker it did not create, so a caller-supplied one closes it.
- **The no-`Worker` case is `typeof Worker === 'undefined'`**, the repo's spelling at nine other
  sites, rather than a `try`/`catch` that would also swallow a CSP `worker-src` refusal and
  silently downgrade every consumer to main-thread rasterization. It is Node and jsdom in
  practice, where pdf.js pre-sets `workerSrc` itself; a browser always has `Worker`.

The `?url` module declaration (`pdfjs-worker.d.ts`) is gone with the import.

## `fit: 'page' | 'width'` (shipped, separately)

Split out of this plan and then built on its own, once the AP review screen needed it: an invoice at fit-page in a half-width drawer is unreadable.

The draft would have shipped **doing nothing**, and the fix is the interesting part. `resolvePageAspectRatio` puts the page's own ratio on the viewport as CSS `aspect-ratio`, and the viewer's root is auto-height, so the viewport derives its height from its width through that ratio — which makes `min(vw/visW, vh/visH)` and `vw/visW` the same number. Changing `fitScale` alone therefore changes nothing. So `fit: 'width'` **stops reserving the aspect ratio at all**: that is what lets the page overflow vertically and scroll instead of shrinking to fit, and it hands the height to the consumer, who must bound it or the viewer collapses. The prop's TSDoc says so, and the demo's example is in a fixed-height box.

One thing the first attempt got wrong and review caught: withholding the ratio leaves the root with **no height of its own**, and `k.base` never adopted its container's — so `fit="width"` rendered a toolbar over an empty strip regardless of the box around it, and the prop's own "give it a bounded container" instruction was fiction. The root now takes `h-full min-h-0` under `'width'` (`k.fill`, the package's existing fill idiom), a test asserts it, and the viewport reserves a scrollbar gutter there so a scrollbar appearing cannot narrow the box, shorten the page and remove itself.

The three things the split-out named are resolved: the toolbar's zoom-reset button is now labelled **"Reset zoom"**, which is what it does (`zoom.setValue(1)`) and removes the collision with the prop; `zoom: 1` therefore means "the base fit, whichever mode that is", and the button resets to it; and the `FrameSizing` relationship stays recorded rather than adopted — `usePdfViewerViewportSize` + `resolvePageAspectRatio` remain an ad-hoc fork of it, which is pre-existing and a larger change than one mode justifies.

Tested at the synchronous seam, in `use-pdf-viewer-page-scale.test.ts`: a tall page in a wide viewport is bounded by both axes under `'page'` and by width alone under `'width'`, the ratio is withheld under `'width'`, and a transposed page fits its rotated width.

## Non-goals

- **Annotation authoring.** Drawing, moving, resizing or persisting regions. `highlights` is a controlled projection of consumer data; the viewer never mutates it.
- **Text search and match highlighting.** Depends on the text layer and is a different feature on top of it.
- **AcroForm field rendering and filling.**
- **Continuous multi-page scroll.**
- **Deriving regions from anything.** No OCR, no confidence thresholds, no field vocabulary. The viewer takes rectangles and colours; what makes a region worth highlighting is entirely the consumer's judgment.

## Known cost this plan does not address

**Rasterization is eager and sequential.** Every page renders to a PNG blob at 1.5–2× before `loading` clears, so a long packet is slow to first paint, holds every page in memory at once, and drives one whole-viewer render per page as it lands. A 1–3 page carrier invoice is fine and the review screen is the near-term consumer, but a lazy raster — active page and neighbours, with an LRU — is the honest fix. Out of scope: it changes the document hook's whole lifecycle — and, per *Page extent* above, it is also where the extent-before-image property belongs, since that is the change that can observe it.

**This is also the first dev-time warning in `components/`.** The idiom to copy is `modules/chat/use-chat-send.ts`'s private hook — a `useRef` flag plus a `process.env.NODE_ENV` guard — and the precedent is being set deliberately.

## As built

Four things the implementation settled differently from the plan. Three are conventions the
plan had not checked; one was a bug a test caught.

- **The two bare filenames are prefixed.** `highlight-geometry.ts` and
  `highlights-context.ts` became `pdf-viewer-highlight-geometry.ts` and
  `pdf-viewer-highlights-context.ts`. Every file in a component folder must be
  `<folder>-<part>` or one of the permitted bare names (`index`, `types`, `context`,
  `slots`, `variants`) — `context.ts` was already taken by the main context — and
  `component-filename-boundary.test.ts` enforces it.
- **The provider is its own file and its own component**, `pdf-viewer-highlights-provider.tsx`.
  Not cosmetic: had the hook been called inside `PdfViewer`, an activation would re-render
  `PdfViewer` and with it the toolbar and rail as children, defeating the whole point of the
  narrow provider. Holding the state in a component that receives `<PdfViewerViewport />`
  as `children` means React sees an unchanged element and skips the viewport subtree, while
  the layer re-renders through context.
- **The layer is two components**, a gate (`PdfViewerHighlights`) and the layer itself. The
  first implementation put the roving hook above an early return, so its effect ran on the
  first paint — before the viewport is measured, when the layer renders `null` — against a
  ref that was still null, and never re-attached; the observer that watches the region set
  was never created. The tab-stop test caught it. A component that mounts only once there
  is something to draw gets a populated ref the first time its effects run.
- **No separate hook test.** The cases the plan listed for `use-pdf-viewer-highlights.test.ts`
  are in `pdf-viewer.test.tsx` instead: the hook reads `PdfViewerContext`, so testing it
  standalone means fabricating a twenty-field `PdfViewerResult` that drifts against the real
  one. Through the component they exercise the real wiring. The unit arithmetic still has
  its own file, which was the point of extracting `toFractionRect`.

  **Since reversed.** The hook takes `activePage`, `safePage` and `goToPage` as arguments
  now, the way `usePdfViewerMagnifier` takes its settings, so no `PdfViewerResult` has to be
  fabricated and `use-pdf-viewer-highlights.test.ts` exists. It covers the hook's own
  decisions — the page filter, the extent it divides by, the navigate-once latch and the
  press ref. The component tests stay where they are, and still exercise the real wiring.

A cleanup pass over the shipped code then took the following, each found by review rather
than by a failing test:

- **The metrics pass came out**, for the reasons under *Page extent* above.
- **One latch, not two.** `revealedRef` already holds the id it revealed, so the second ref
  tracking the previous active id was answerable from it.
- **`rotation` is the only rotation input.** `usePdfViewerPageScale` took `rotation` *and*
  `isTransposed`, where the second is a pure function of the first — a contradictable pair,
  and the tests were hand-writing both. `isRotationTransposed` is now exported from the
  rotation hook and the scale hook derives it. `rotation` also left `PdfViewerResult`
  entirely: sharing the transform left it with no reader.
- **Region classes are computed ten times, not once per region per render.** `cn` memoises
  only on string arguments and three of the four here are arrays, so every region ran a
  full clsx + tailwind-merge. The class string is a pure function of `(color, active)` —
  five colours, two states — so a module-level lookup covers every document. Measured:
  ~142 µs per layer render at 40 regions down to ~4.5 µs, on a layer that re-renders every
  zoom step and every resize frame.
- **`preventDefault` on the Escape branch.** The comment claimed `stopPropagation` kept an
  enclosing drawer from reading Escape as a dismiss. It does not: `useEscapeLayer` listens
  on `document`, the node React's own root listener sits on under the App Router, and
  `stopPropagation` does not stop a sibling listener on the node an event fires from.
  `defaultPrevented` is the protocol that layer actually honours.
- **Roving is pointed at nothing in a decorative layer**, which was otherwise seating a tab
  stop on a `<span>` inside an `aria-hidden` subtree — and the announcement is silenced
  there too, since it named something a reader cannot reach.
- **The demo rasterizes once.** Three `src` instances meant three pdf.js workers and 42
  rasterizations on the docs page; the two highlight examples now use static pages, which
  the overlay is indifferent to. "Driven from a list" also binds both ways now — as drafted
  it passed `activeHighlightId` with no change callback, which made its own boxes
  unpressable and its layer `aria-hidden`.
- Plus: the provider's props are the hook's options rather than a third copy of them, the
  interactive/decorative element fork is one tag instead of two near-identical elements,
  `activeLabel` comes off `regions`, the dev warning is a named private hook, the kata has
  one `centred` constant for the two boxes that must agree (and one dead class fewer), and
  `useScrollWithin` dropped a type whose only field was invariantly `true`.

Verified: `biome check` clean; the reconstructed `tsc` program reports zero diagnostics for
everything `packages/ui/tsconfig.json` includes (the four it does report are pre-existing
Vite-only imports under `src/docs`, which that tsconfig excludes), canary-probed to prove
each new file was really in the program; and the full suite — **480 files, 6475 tests** —
passes, including 47 in `pdf-viewer.test.tsx`. An offline, workspace-filtered
`pnpm install` turned out to work where the full install does not, so these are real runs
rather than hand-traced.

**The state-scoping claim is measured, and it is narrower than "the toolbar never
re-renders".** Instrumented at 20 pages × 40 regions, an activation the viewer owns renders
the gate and the layer and nothing else — `PdfViewer`, the toolbar, the rail and the
viewport are all skipped. A consumer whose change callback stores the id above
`<PdfViewer>` re-renders the whole viewer from its own state change, as any lifted state
would; the scoping cannot prevent that and is not meant to. `pdf-viewer.test.tsx` guards
the part that is guardable — that the subtree the provider wraps does not re-render to
deliver an activation to a consumer inside it.

## Sync to midgard

No dependency change, no app-side coupling.

- `src/components/pdf-viewer/types.ts` — highlight types, page extent fields.
- `src/components/pdf-viewer/pdf-viewer.tsx` — the new props, the narrow provider around the viewport.
- `src/components/pdf-viewer/pdf-viewer-highlight-geometry.ts` *(new)* — `toFractionRect`, the pure converter.
- `src/components/pdf-viewer/use-pdf-viewer-highlights.ts` *(new)* — per-page filtering, the active binding, the reveal.
- `src/components/pdf-viewer/pdf-viewer-highlights.tsx` *(new)* — the gate and the layer.
- `src/components/pdf-viewer/pdf-viewer-highlights-provider.tsx` *(new)* — the state, scoped to the viewport.
- `src/components/pdf-viewer/pdf-viewer-highlights-context.ts` *(new)* — the viewport-scoped context.
- `src/components/pdf-viewer/pdf-viewer-viewport.tsx` — mounts the layer in `page-frame`.
- `src/components/pdf-viewer/pdf-viewer-toolbar.tsx` — the `ToggleIconButton`.
- `src/components/pdf-viewer/use-pdf-viewer.ts` — `hasHighlights` / `highlightsVisible` on the result.
- `src/components/pdf-viewer/use-pdf-viewer-document.ts` — the page extent, off the raster viewport; the bundler-agnostic worker setup.
- `src/components/pdf-viewer/use-pdf-viewer-page-scale.ts` — the shared transform string, and `fit`.
- `src/components/pdf-viewer/pdf-viewer-zoom-controls.tsx` — "Fit to page" → "Reset zoom", freeing the word for the prop.
- `src/components/pdf-viewer/pdf-viewer-viewport.tsx` — the scrollbar gutter under `fit: 'width'`.
- `src/components/pdf-viewer/pdfjs-worker.d.ts` *(deleted)* — the `?url` module declaration, gone with the import.
- `src/components/pdf-viewer/index.ts` — export the highlight types.
- `src/hooks/use-scroll-within.ts` — the `inline` axis (increment 3).
- `src/recipes/kata/pdf-viewer.ts` — the `highlights` group, reading `iro` by key.
- `src/docs/demos/components/pdf-viewer.tsx` — the highlight examples and a fit-to-width one.
- `src/__tests__/boundary/` — `pdf-viewer-highlight-geometry.test.ts` (new), `pdf-viewer.test.tsx` (+16 cases), `use-pdf-viewer-page-scale.test.ts` (the shared transform).
- `docs/HOOKS.md` — the `useScrollWithin` row.

`docs/COMPONENTS.md` needs no edit: it indexes `pdf-viewer` by name, and per-component props live in TSDoc.
