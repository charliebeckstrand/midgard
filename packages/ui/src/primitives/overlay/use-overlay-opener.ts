'use client'

import { getTabbableOptions } from '@floating-ui/react/utils'
import { type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { isFocusable } from 'tabbable'

/**
 * The element of the last press or focus on the page. A press names the
 * focusable element that it is in, or `null` when it is in none.
 *
 * @internal
 */
let lastPlace: Element | null = null

/** The count of mounted overlays, which keep the document listeners on. @internal */
let mounted = 0

/** Records the focusable element of a press. @internal */
function onPress(event: PointerEvent): void {
	lastPlace = event.target instanceof Element ? focusableAncestor(event.target) : null
}

/** Records the element of a focus. @internal */
function onFocus(event: FocusEvent): void {
	lastPlace = event.target instanceof Element ? event.target : null
}

/** The focusable element that `target` is in, or `null`. @internal */
function focusableAncestor(target: Element): Element | null {
	const options = getTabbableOptions()

	for (let node: Element | null = target; node; node = node.parentElement) {
		if (isFocusable(node, options)) return node
	}

	return null
}

/**
 * Keeps {@link lastPlace} while an overlay is mounted, open or closed. Each
 * overlay reads the place of the press that opens it, and that press comes
 * before the overlay opens. The last overlay to unmount stops the listeners.
 *
 * @returns The cleanup of the mount.
 * @internal
 */
function listen(): () => void {
	if (mounted === 0) {
		document.addEventListener('pointerdown', onPress, true)

		document.addEventListener('focusin', onFocus, true)
	}

	mounted += 1

	return () => {
		mounted -= 1

		if (mounted > 0) return

		document.removeEventListener('pointerdown', onPress, true)

		document.removeEventListener('focusin', onFocus, true)

		lastPlace = null
	}
}

/**
 * `element` when it is an element in the document other than `<body>`, else
 * `null`.
 *
 * @internal
 */
function connected(element: Element | null): HTMLElement | null {
	if (!(element instanceof HTMLElement) || !element.isConnected) return null

	return element === element.ownerDocument.body ? null : element
}

/**
 * The element that opened a modal overlay, as the default focus return. It
 * is the element of the last press or focus as the overlay opened. A tap on a
 * button in Safari does not focus the button, so the element that had the
 * focus can be an unrelated field. A press therefore counts as well as a focus.
 * When the press was on no focusable element, the element that had the focus
 * is the opener.
 *
 * @remarks The ref reads its element at the close. An opener that is gone by
 * then gives way to the element that had the focus as the overlay opened. When
 * both are gone, the ref holds `null`.
 *
 * @param open - Whether the overlay is open.
 * @param returnFocusTo - The return element of the caller, which wins.
 * @returns `returnFocusTo`, else a ref to the opener.
 * @internal
 */
export function useOverlayOpener(
	open: boolean,
	returnFocusTo: RefObject<HTMLElement | null> | undefined,
): RefObject<HTMLElement | null> {
	const placesRef = useRef<{ opener: Element | null; before: Element | null }>({
		opener: null,
		before: null,
	})

	// The listeners must be on before the press that opens an overlay, so each
	// overlay keeps them on while it is mounted, open or closed.
	useLayoutEffect(listen, [])

	useLayoutEffect(() => {
		if (!open) return

		const active = document.activeElement

		placesRef.current = { opener: lastPlace ?? active, before: active }
	}, [open])

	const [ref] = useState<RefObject<HTMLElement | null>>(() => ({
		get current() {
			const { opener, before } = placesRef.current

			return connected(opener) ?? connected(before)
		},
	}))

	return returnFocusTo ?? ref
}
