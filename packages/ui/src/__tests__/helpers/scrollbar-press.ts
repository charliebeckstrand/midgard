import { mockDomGeometry } from './mock-dom-geometry'

/**
 * Gives `scroller` a vertical overflow and makes a press on its vertical
 * scrollbar, for `isScrollbarPress` in `utilities/scrollbar-press.ts`.
 *
 * @remarks
 * jsdom does no layout. The helper stubs a client box of 100 by 100 and a
 * scroll height of 500, and sets `overflowY: auto` on the inline style, which
 * the `getComputedStyle` of jsdom reads. The press has `offsetX` 110 and
 * `offsetY` 50, which is in the gutter to the right of the client box.
 *
 * The caller dispatches the event, so it can read the result of
 * `dispatchEvent`.
 *
 * @param scroller - The node that scrolls. The caller puts it in the document.
 * @param type - The type of the press. A `pointer` type makes a
 * `PointerEvent`, and each other type makes a `MouseEvent`.
 * @returns The press, which bubbles and is cancelable.
 *
 * @example
 * ```typescript
 * const scroller = attach(document.createElement('div'))
 *
 * scroller.dispatchEvent(scrollbarPress(scroller))
 * ```
 */
export function scrollbarPress(scroller: HTMLElement, type = 'pointerdown'): MouseEvent {
	scroller.style.overflowY = 'auto'

	mockDomGeometry(scroller, {
		clientWidth: 100,
		clientHeight: 100,
		scrollWidth: 100,
		scrollHeight: 500,
	})

	const init = { bubbles: true, cancelable: true }

	const event = type.startsWith('pointer')
		? new PointerEvent(type, init)
		: new MouseEvent(type, init)

	Object.defineProperty(event, 'offsetX', { value: 110 })

	Object.defineProperty(event, 'offsetY', { value: 50 })

	return event
}
