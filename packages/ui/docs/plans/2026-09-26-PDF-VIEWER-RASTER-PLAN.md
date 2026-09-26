# PDF Viewer — On-Demand Rasterization — Design Plan — 2026-09-26

How `PdfViewer` stops rasterizing every page of a `src` document at open, and renders the pages that the reader looks at. The [browser bench](../../src/__benchmarks__/browser/README.md#pdf-viewer) measures each increment. This plan answers the "known cost" that the [highlights plan](2026-08-26-PDF-VIEWER-HIGHLIGHTS-PLAN.md) left open: "Rasterization is eager and sequential."

## Thesis

A reader looks at one page at a time. The viewer must do the work for that page, and for the page that the reader will go to next. It must not do the work for the other pages until a reader asks for them. The document opens in one parse. The parse gives the page count and the size of each page, so the chrome is whole before any page renders.

The `pages` prop does not change. A caller that supplies its own images gets the same viewer as before. Only the `src` path changes.

## Current state (verified in tree, 2026-09-26)

- **One run rasterizes the whole document.** `rasterizeDocument` (`use-pdf-viewer-document.ts`) fetches the file, parses it, and then renders and encodes each page in order. Each page becomes a PNG blob URL in the module cache (`pdf-viewer-document-cache.ts`). The run then destroys the pdf.js document. So a page that the cache does not hold cannot come back without a new parse.
- **The first page paints early, the rest follows.** Since #1416, the viewport shows the active page as it lands. The page count in the toolbar grows as pages land, so the page navigation stays disabled until the last page.
- **A page is known only when it renders.** The page size and the point size (`pointWidth`, `pointHeight`) come from the render. A highlight on page 40 of a 50-page document therefore has no geometry until page 40 renders.
- **The thumbnail is the page.** The rail shows `thumbnail ?? src`, and the rasterizer sets no `thumbnail`. Each thumbnail therefore decodes the full raster, 7.4 MiB at 2x, to show a 122 × 158 box.
- **Each landed page renders the viewer again.** Each report publishes a new snapshot, and the viewer reads it through `useSyncExternalStore`. A 50-page document renders the viewer 50 times during its load.
- **`defaultPage` beyond the first page jumps.** The page state holds the number, and `safePage` clamps it to the pages that have landed. After #1416 a `defaultPage={10}` shows page 1, then jumps to page 10 when it lands.

## Measurements

Chromium 141, headless, device pixel ratio 1, a 50-page invoice from `pdf-fixtures.ts`:

| Step | Cost |
| --- | --- |
| Open the document (`numPages`) | 1.4 ms |
| Open, and read the size of each of the 50 pages | 6.4 ms |
| Render one page at 2x, as pdf.js paces it | 17.2 ms (2 frames) |
| Render one page at 2x, work only | 4.3 ms |
| Render one page at 0.2x (a thumbnail), work only | 4.2 ms |
| Encode one 2x page to PNG | 12.7 ms |
| Show a resident page (a page flip) | 2.2 ms (the first reading, 0.4 ms, timed an empty viewer) |
| Longest main-thread task during one render and encode | 12 ms |
| Thumbnail PNG at 0.2x | 6.3 KiB |
| 14 resident 1.5x pages | 2.74 MiB of PNG, 58 MiB if each decodes |

pdf.js paints a display render in slices of 15 ms, and it waits for an animation frame before each slice. A frame costs about 17 ms in this container (bench README). The "work only" rows answer each wait in a microtask (`withoutFrames` in the bench), so they give the real work. Three facts follow:

- **The encode is most of the work.** A page is about 4 ms of render and 13 ms of PNG encode. The encode is three quarters of the work of a page.
- **The frame waits are most of the time.** A 2x render takes 17 ms, and 13 ms of it is waiting. The viewer renders off screen, so it gains nothing from the frame pacing, which exists to keep an on-screen canvas smooth.
- **The size of a raster barely changes its cost.** A 0.2x render costs the same work as a 2x render, so a thumbnail is not free. Fifty thumbnails are about 200 ms of work.

The size of every page costs 6.4 ms, against 1,213 ms for the whole raster. So the open can give the full page count and every page extent at once.

## Design

### The document stays open

The cache holds the pdf.js document for as long as it holds the entry. The entry frees the document when it leaves the cache, which is the same rule that frees its blob URLs now. A viewer that parks and comes back finds the document open. A render for any page then needs no new fetch and no new parse.

The cost is the memory of the parsed document in the worker, for up to `MAX_DOCUMENTS` (4) entries. The bench does not measure it, because the page cannot read the heap of the worker.

### The snapshot has a slot for each page

The open publishes one slot for each page, with its size in pixels at the raster scale and its size in points. A slot has no image until its page renders. The page count, the page navigation, the highlight geometry, and the size of the viewport before the image all read the slots. So they are whole at the open.

The slot is an internal type. The public `PdfViewerPage` keeps its required `src`, because a caller's page always has an image.

### A queue renders the pages in order of need

One queue for each document renders one page at a time, in this order:

1. The active page.
2. The page after it, then the page before it.
3. The thumbnails that the rail shows.

A page change puts the new active page at the front. A render for a page that nobody wants now is canceled (`renderTask.cancel()`), because the next page change can come before it ends. The queue stops when it has nothing to render. A reader who stays on one page causes no more work after the neighbors are done.

The frame waits stay. pdf.js has no option to turn them off for a display render, and the print intent that skips them also changes which annotations draw. They cost time, not work, and a neighbor renders while the reader reads the active page. So the reader waits for them only on a far page.

### The full rasters are bounded

A document keeps the full rasters of the last 8 pages that the queue rendered. A page that leaves that set loses its blob URL, and the queue renders it again when a reader comes back to it. A reader can go back through 8 pages with no render.

### The thumbnail is its own raster

The rail shows a thumbnail raster at the width of the rail, about 0.2x (6.3 KiB as PNG). A thumbnail renders when the rail shows it, and stays for the life of the entry. The rail keeps the page number as a fallback until the thumbnail lands, as it does now for a page with no image.

## Decide before building

Settled on 2026-09-26: the maintainer left each choice to this plan, so each proposal below stands.

1. **When `onLoad` fires.** Its TSDoc says "once the document at `src` is rasterized". Under this plan, the document is never "rasterized" as a whole. The proposal is that `onLoad` fires when the document opens, with the page count, because that is when a consumer can show its chrome. The alternative is to fire it when the active page first paints. Either way the meaning changes, and the TSDoc changes with it.
2. **The size of the full-raster set.** The proposal is 8 pages. Each 1.5x page is about 200 KiB as PNG and 4.2 MiB decoded. Fourteen resident pages hold 2.74 MiB of PNG, and 58 MiB if the browser keeps each one decoded. A bitmap (decision 3) is always decoded, so 8 pages bound it at about 33 MiB for each document at 1.5x.
3. **The encode.** The first draft read the encode as a third of the cost of a page, and proposed to keep it. Increment 1 measured three quarters of the work, so the proposal changed: the rasterizer keeps each page as an `ImageBitmap`, and the viewport and the magnifier draw it. The `pages` path keeps its images. Increment 4 lands it.

## Increments

Each increment lands on its own, with its bench rows, and leaves the viewer whole.

1. **Measure honestly (done).** The render rows without the frame waits, the page-flip scenario, and the retained PNG of a document. No component change. The numbers are in the table above.
2. **Open and keep the document (done).** The open publishes the slots and keeps the pdf.js document in the entry. The existing loop still renders every page, in page order. The page count and the highlight geometry are whole at the open, and `defaultPage` no longer jumps. Decision 1 lands here. The first page paints in 63 / 67 / 67 / 74 ms at 1 / 3 / 14 / 50 pages. A page that the render skips (no 2D context, or an encode that fails) keeps its slot with no image, and the viewport shows its placeholder.
3. **The queue (done).** Render the active page and its neighbors only, cancel an unwanted render, and bound the full rasters (decision 2). The cold open of a 50-page document renders 2 full rasters, not 50. The rail needs an image for each page before increment 5, so the queue renders a thumbnail of each page after the neighbors, and the queue does this work once for each document. A far flip costs 47 ms.
4. **No encode (done).** The rasterizer keeps an `ImageBitmap` for each page, and the viewport and the magnifier draw it (decision 3). At 2x, 8 bitmaps for each of 4 documents come to about 236 MiB. The maintainer therefore chose a budget of 48 MiB of bitmaps across all documents, beside the bound of 8. The first page paints in 47 to 63 ms, and a far flip costs 20 to 24 ms.
5. **Thumbnail rasters.** Increment 3 renders a small raster of each page. This increment renders only the thumbnails that the rail shows, so a reader on one page causes no render after the neighbors.
6. **Re-render on zoom.** The active page renders again at the zoom scale above 1, so that text stays sharp. The queue makes this a change of scale on one request.

## Non-goals

- **Continuous scroll.** The viewer shows one page at a time, and this plan keeps that.
- **The text layer.** It is increment 8 of the highlights plan, and it needs the page surface extraction first.
- **A change to the `pages` prop.** A caller's images do not go through the queue.
- **The `getOrInsertComputed` gap.** pdf.js 6 needs methods that browsers below the floor lack. A separate change fixed it: the viewer loads the legacy build of pdf.js.

## Proof

The bench is the acceptance test. Each increment records its rows in the optimization log of the bench README. The targets:

- The first page paints in about 60 ms at 1, 3, 14, and 50 pages, as after #1416.
- The page count and the page navigation are whole at the open, at each page count.
- After the neighbors are done, a reader on one page causes no render.
- A flip to a neighbor shows a resident page. A flip to a far page costs one render.
- The resident rasters of a document stay at or under the bound.

The jsdom suite drives the cache through its loader seam, as `pdf-viewer.test.tsx` does now. The browser suite asserts the order of the queue and the cancel.

---

**See also:** [`2026-08-26-PDF-VIEWER-HIGHLIGHTS-PLAN.md`](2026-08-26-PDF-VIEWER-HIGHLIGHTS-PLAN.md) · [`pdf-viewer-document-cache.ts`](../../src/components/pdf-viewer/pdf-viewer-document-cache.ts) · [`use-pdf-viewer-document.ts`](../../src/components/pdf-viewer/use-pdf-viewer-document.ts).
