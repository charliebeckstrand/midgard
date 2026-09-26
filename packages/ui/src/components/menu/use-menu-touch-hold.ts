import { type PointerEvent, useEffect, useRef } from 'react'

/** Hold time, in ms, before a touch opens the context menu. Android opens its own at about 500. */
export const TOUCH_CONTEXT_MENU_DELAY = 500

/** Travel, in px, that turns a held touch into a scroll or a drag. */
const SLOP = 10

/** Time, in ms, in which the click that ends the hold is dropped. */
const CLICK_WINDOW = 1000

/** Native pointer events that a surface has already claimed, so a nested surface does not claim them again. */
const claimed = new WeakSet<Event>()

type Hold = { timer: ReturnType<typeof setTimeout>; x: number; y: number }

/**
 * Opens a context menu on a touch long press.
 *
 * iOS Safari fires no `contextmenu` event on a long press. Thus a menu that opens on
 * `contextmenu` cannot open on an iPhone. This hook times a touch hold on the surface. When the
 * hold reaches {@link TOUCH_CONTEXT_MENU_DELAY}, it dispatches a `contextmenu` event at the point
 * of the touch, so each existing `onContextMenu` handler under the surface runs. A native
 * `contextmenu` event during the hold, as on Android, cancels the timer. When a handler takes the
 * event, the hook drops the click that ends the hold.
 *
 * @returns Handlers for the surface element.
 *
 * @internal
 */
export function useMenuTouchHold() {
	const hold = useRef<Hold | null>(null)

	const dropClickUntil = useRef(0)

	const cancel = () => {
		if (hold.current) clearTimeout(hold.current.timer)

		hold.current = null
	}

	// Clear a pending hold on unmount, so the timer does not dispatch at a gone surface.
	useEffect(
		() => () => {
			if (hold.current) clearTimeout(hold.current.timer)
		},
		[],
	)

	return {
		onPointerDown: (event: PointerEvent) => {
			cancel()

			if (event.pointerType !== 'touch' || !event.isPrimary) return

			if (claimed.has(event.nativeEvent)) return

			claimed.add(event.nativeEvent)

			const { clientX, clientY } = event

			const target = event.target

			if (!(target instanceof Element)) return

			const timer = setTimeout(() => {
				hold.current = null

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

			hold.current = { timer, x: clientX, y: clientY }
		},
		onPointerMove: (event: PointerEvent) => {
			const current = hold.current

			if (!current) return

			if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > SLOP) cancel()
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
