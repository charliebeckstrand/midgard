/**
 * Makes the browser compute the document's styles and layout now. A CSS
 * transition then starts from the style an element has at this moment.
 *
 * @remarks
 * A transition runs between two computed styles. An element that comes back on
 * screen and changes its style in the same frame gives the browser one style
 * only, and the change snaps. A flush between the two changes records the first
 * style.
 *
 * The flush is a call, not a bare property read such as `element.offsetHeight`.
 * The React Compiler removes a read whose value goes unused, and the flush with
 * it.
 */
export function forceStyleFlush(): void {
	document.documentElement.getBoundingClientRect()
}
