'use client'

import { type RefObject, useLayoutEffect } from 'react'
import { containsThroughPortals } from '../../utilities/floating-portal-registry'

/**
 * Fits the box of an overlay that is fixed to the viewport to the visual
 * viewport, so a panel on the bottom edge stays above the on-screen keyboard
 * of a field in it.
 *
 * @remarks On iOS, the keyboard does not make the layout viewport smaller. It
 * covers the bottom of the page, and only the visual viewport gets smaller. A
 * box that is fixed to the viewport thus stays under the keyboard, and a drawer
 * on its bottom edge goes behind the keyboard. While a field in the box has the
 * focus, the hook sets the top and bottom of the box to the edges of the
 * visual viewport, and follows each change of the visual viewport. The
 * backdrop keeps the full viewport, so the page under a translucent keyboard
 * stays dim.
 *
 * The box follows only the keyboard of its own field. The visual viewport also
 * changes for a keyboard that the page does not own, such as the keyboard of
 * the address bar, and for the toolbars of the browser. If the box followed
 * those changes, the panel height would change behind the address bar, and
 * then step back to the full viewport over the frames that the browser takes
 * to give the visual viewport back. The box therefore starts to follow the
 * visual viewport only when a field in it gets the focus. A field in a
 * floating surface that opened from the box, such as a popover in a drawer, is
 * a field in the box.
 *
 * The box stops to follow the visual viewport when the keyboard of the field
 * goes down, that is, when the visual viewport fills the window again and no
 * field in the box has the focus. It also stops when the page loses the focus,
 * for example to the address bar. The focus change alone does not move the
 * box. A tap on a button in the panel, such as Close, takes the focus from
 * the field when the press starts. If the box moved then, the button would
 * move out from under the finger, and the tap would not click it.
 *
 * A pinch zoom also makes the visual viewport smaller, but the page is then
 * larger, not covered. The box then keeps the full viewport.
 *
 * @param node - The box of the overlay, or `null` before it mounts.
 * @param backdropRef - The backdrop in the box, if it renders.
 * @param active - Whether the box is fixed to the viewport and on screen.
 * @internal
 */
export function useOverlayViewportFit(
	node: HTMLElement | null,
	backdropRef: RefObject<HTMLElement | null>,
	active: boolean,
): void {
	useLayoutEffect(() => {
		const viewport = window.visualViewport

		if (!active || !node || !viewport) return

		// The edges of the last write. A write that changes nothing is skipped.
		let edges = { top: 0, bottom: 0 }

		// Sets the edges of the box, and moves the backdrop out past the box by
		// the same amounts.
		const apply = (top: number, bottom: number) => {
			if (top === edges.top && bottom === edges.bottom) return

			edges = { top, bottom }

			setEdges(node, top, bottom)

			if (backdropRef.current) setEdges(backdropRef.current, -top, -bottom)
		}

		// The focused element, while the page has the focus.
		let focused: Element | null = document.activeElement

		// Whether the keyboard on screen is for a field in the box.
		let owned = false

		const fit = () => {
			const field = opensKeyboard(focused) && containsThroughPortals(node, focused)

			if (field) owned = true

			// A keyboard that is not for a field in the box moves no edge of the box.
			if (!owned) return apply(0, 0)

			// A pinch zoom moves no edge of the box.
			if (Math.abs(viewport.scale - 1) > 0.01) return apply(0, 0)

			const { offsetTop, height } = viewport

			const top = Math.max(0, offsetTop)

			const bottom = Math.max(0, window.innerHeight - offsetTop - height)

			apply(top, bottom)

			// The keyboard of the field is down when the visual viewport fills the
			// window again. Less than a pixel is layout rounding.
			if (!field && top < 1 && bottom < 1) owned = false
		}

		fit()

		const listeners = new AbortController()

		viewport.addEventListener('resize', fit, { signal: listeners.signal })

		viewport.addEventListener('scroll', fit, { signal: listeners.signal })

		// The focus moves. The listeners are on the document, because a floating
		// surface that opens from the box is not in the box. The target of `focusin`
		// has the focus. The related target of `focusout` gets the focus next.
		document.addEventListener(
			'focusin',
			(event) => {
				focused = event.target instanceof Element ? event.target : null

				fit()
			},
			{ signal: listeners.signal },
		)

		document.addEventListener(
			'focusout',
			(event) => {
				focused = event.relatedTarget instanceof Element ? event.relatedTarget : null

				fit()
			},
			{ signal: listeners.signal },
		)

		// The browser takes the focus, for example for its address bar. The
		// keyboard on screen is then the browser's.
		window.addEventListener(
			'blur',
			() => {
				focused = null

				owned = false

				fit()
			},
			{ signal: listeners.signal },
		)

		window.addEventListener(
			'focus',
			() => {
				focused = document.activeElement

				fit()
			},
			{ signal: listeners.signal },
		)

		return () => {
			listeners.abort()

			apply(0, 0)
		}
	}, [node, backdropRef, active])
}

/** Sets the `top` and `bottom` of `element` in pixels, or clears each one that is zero. @internal */
function setEdges(element: HTMLElement, top: number, bottom: number) {
	element.style.top = top === 0 ? '' : `${top}px`

	element.style.bottom = bottom === 0 ? '' : `${bottom}px`
}

/** The types of `<input>` that open no on-screen keyboard. */
const NO_KEYBOARD = new Set([
	'button',
	'checkbox',
	'color',
	'file',
	'hidden',
	'image',
	'radio',
	'range',
	'reset',
	'submit',
])

/**
 * Whether `element` is a field that opens the on-screen keyboard, or the
 * picker that takes its place: a text field, a select, or editable content.
 * @internal
 */
function opensKeyboard(element: Element | null): element is HTMLElement {
	if (element instanceof HTMLInputElement) return !NO_KEYBOARD.has(element.type)

	return (
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement ||
		(element instanceof HTMLElement && element.isContentEditable)
	)
}
