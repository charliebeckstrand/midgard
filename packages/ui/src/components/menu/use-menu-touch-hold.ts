import { type PointerEvent, useRef } from 'react'
import { useTouchHold } from '../../hooks/use-touch-hold'

/** Hold time, in ms, before a touch opens the context menu. Android opens its own at about 500. */
export const TOUCH_CONTEXT_MENU_DELAY = 500

/** Time, in ms, in which the click that ends the hold is dropped, unless a new press starts first. */
const CLICK_WINDOW = 1000

/** Native pointer events that a surface has already claimed, so a nested surface does not claim them again. */
const claimed = new WeakSet<Event>()

/**
 * Opens a context menu on a touch long press.
 *
 * iOS Safari fires no `contextmenu` event on a long press. Thus a menu that opens on
 * `contextmenu` cannot open on an iPhone. This hook times a touch hold on the surface with
 * {@link useTouchHold}. When the hold reaches {@link TOUCH_CONTEXT_MENU_DELAY}, it dispatches a `contextmenu` event at the point
 * of the touch, so each existing `onContextMenu` handler under the surface runs. A native
 * `contextmenu` event during the hold, as on Android, cancels the timer. When a handler takes the
 * event, the hook drops the click that ends the hold. While the touch holds, the page selects no
 * text. A hold inside a `data-touch-readout` element opens no
 * menu. On a map the hold opens the readout, and on a chart it does nothing.
 *
 * @returns Handlers for the surface element.
 *
 * @internal
 */
export function useMenuTouchHold() {
	const dropClickUntil = useRef(0)

	const hold = useTouchHold(({ target, x, y }) => {
		// A chart or a map keeps the hold: a map opens its readout, and a chart does nothing.
		if (!(target instanceof Element) || target.closest('[data-touch-readout]')) return

		const menu = new MouseEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			composed: true,
			clientX: x,
			clientY: y,
			button: 2,
		})

		// A handler that opens a menu calls `preventDefault`, so `dispatchEvent` returns false.
		if (!target.dispatchEvent(menu)) dropClickUntil.current = Date.now() + CLICK_WINDOW
	})

	const cancel = hold.cancel

	return {
		onPointerDown: (event: PointerEvent) => {
			cancel()

			// A new press is a new gesture. Its click is not the one that ends the hold,
			// even inside the window, such as a quick tap on an item of the open menu.
			dropClickUntil.current = 0

			if (event.pointerType !== 'touch' || claimed.has(event.nativeEvent)) return

			claimed.add(event.nativeEvent)

			// Each hold on the surface, a chart or a map included, selects no text on the page.
			hold.start(event, TOUCH_CONTEXT_MENU_DELAY)
		},
		onPointerMove: hold.move,
		onPointerUp: cancel,
		onPointerCancel: cancel,
		onContextMenuCapture: (event: { isTrusted: boolean }) => {
			if (event.isTrusted) cancel()
		},
		onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => {
			if (Date.now() > dropClickUntil.current) return

			dropClickUntil.current = 0

			event.preventDefault()

			event.stopPropagation()
		},
	}
}
