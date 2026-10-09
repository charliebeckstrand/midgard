import { type PointerEvent, useRef } from 'react'
import { useTimeout } from '../../hooks/use-timeout'
import { TOUCH_SLOP } from '../../hooks/use-touch-tap'
import { holdTextSelection } from '../../utilities/hold-text-selection'

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
 * `contextmenu` cannot open on an iPhone. This hook times a touch hold on the surface. When the
 * hold reaches {@link TOUCH_CONTEXT_MENU_DELAY}, it dispatches a `contextmenu` event at the point
 * of the touch, so each existing `onContextMenu` handler under the surface runs. A native
 * `contextmenu` event during the hold, as on Android, cancels the timer. When a handler takes the
 * event, the hook drops the click that ends the hold. While the touch holds, the page selects no
 * text (see {@link holdTextSelection}). A hold inside a `data-touch-readout` element opens no
 * menu. On a map the hold opens the readout, and on a chart it does nothing.
 *
 * @returns Handlers for the surface element.
 *
 * @internal
 */
export function useMenuTouchHold() {
	// The timer clears on unmount, so it does not dispatch at a gone surface.
	const hold = useTimeout()

	// The point where the pending hold started.
	const origin = useRef({ x: 0, y: 0 })

	const dropClickUntil = useRef(0)

	const cancel = hold.clear

	return {
		onPointerDown: (event: PointerEvent) => {
			cancel()

			// A new press is a new gesture. Its click is not the one that ends the hold,
			// even inside the window, such as a quick tap on an item of the open menu.
			dropClickUntil.current = 0

			if (event.pointerType !== 'touch' || !event.isPrimary) return

			// Each hold on the surface, a chart or a map included, selects no text on the page.
			holdTextSelection(event)

			if (claimed.has(event.nativeEvent)) return

			claimed.add(event.nativeEvent)

			const { clientX, clientY } = event

			const target = event.target

			if (!(target instanceof Element)) return

			// A chart or a map keeps the hold: a map opens its readout, and a chart does nothing.
			if (target.closest('[data-touch-readout]')) return

			hold.set(() => {
				const menu = new MouseEvent('contextmenu', {
					bubbles: true,
					cancelable: true,
					composed: true,
					clientX,
					clientY,
					button: 2,
				})

				// A handler that opens a menu calls `preventDefault`, so `dispatchEvent`
				// returns false.
				if (!target.dispatchEvent(menu)) dropClickUntil.current = Date.now() + CLICK_WINDOW
			}, TOUCH_CONTEXT_MENU_DELAY)

			origin.current = { x: clientX, y: clientY }
		},
		onPointerMove: (event: PointerEvent) => {
			if (!hold.pending()) return

			const { x, y } = origin.current

			if (Math.hypot(event.clientX - x, event.clientY - y) > TOUCH_SLOP) cancel()
		},
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
