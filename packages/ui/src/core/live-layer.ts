/**
 * Gives each live layer in the document. A live layer is a body-level region
 * that shows messages while a modal overlay is open, such as the toast
 * viewport. The `data-live-layer` attribute marks it.
 *
 * A modal focus manager of floating-ui sets `aria-hidden` on each body-level
 * node outside the surface (`markOthers`). It keeps only a node that is a live
 * region when the overlay opens. A toast viewport with no toast is not a live
 * region, so a toast that comes later goes into a hidden subtree, and a screen
 * reader does not speak it (WCAG 4.1.3). A modal surface gives these nodes to
 * `getInsideElements`, so the manager does not mark them.
 *
 * @returns The live layers, in document order.
 */
export function liveLayers(): Element[] {
	return Array.from(document.querySelectorAll('[data-live-layer]'))
}
