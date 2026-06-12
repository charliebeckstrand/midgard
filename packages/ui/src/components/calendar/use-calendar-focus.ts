'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import { useA11yRoving } from '../../hooks'

// Out-of-range day cells render as `<button disabled>`, which can't take
// focus. Every query here scopes to focusable buttons and roving skips
// disabled cells; `.focus()` on a disabled element is a no-op that would
// freeze the active index at the edge of a disabled range (WCAG 2.1.1).
const FOCUSABLE = 'button:not(:disabled)'

// Sealed surfaces swallow these even when no move applies, so a dead key
// neither scrolls the page nor reaches an outer keyboard model.
const NAVIGATION_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

type CalendarFocusOptions = {
	headerRef: RefObject<HTMLElement | null>
	gridRef: RefObject<HTMLElement | null>
	footerRef?: RefObject<HTMLElement | null>
	cols?: number
	/**
	 * Seals the surface: every navigation key stops here, handled or not.
	 * For surfaces nested inside another keyboard model (the month/year
	 * picker inside the date picker dialog), where a leaked arrow would
	 * drive the outer model underneath the open surface.
	 */
	stopPropagation?: boolean
}

function firstButton(container: HTMLElement | null): HTMLElement | null {
	return container?.querySelector<HTMLElement>(FOCUSABLE) ?? null
}

function middleButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

	return buttons[Math.floor(buttons.length / 2)] ?? null
}

function lastButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = container?.querySelectorAll<HTMLElement>(FOCUSABLE)

	if (!buttons?.length) return null

	return buttons.item(buttons.length - 1)
}

function isTopRow(container: HTMLElement | null, cols: number): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	return index >= 0 && index < cols
}

function isBottomRow(container: HTMLElement | null, cols: number): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	if (index < 0) return false

	return index + cols >= buttons.length
}

/** Sealed surfaces consume every navigation key, moved or not. */
function seal(e: KeyboardEvent, stopPropagation: boolean): void {
	if (!stopPropagation) return

	if (!e.defaultPrevented && NAVIGATION_KEYS.has(e.key)) e.preventDefault()

	if (e.defaultPrevented) e.stopPropagation()
}

export function useCalendarFocus({
	headerRef,
	gridRef,
	footerRef,
	cols = 7,
	stopPropagation = false,
}: CalendarFocusOptions) {
	const headerRoving = useA11yRoving(headerRef, {
		itemSelector: FOCUSABLE,
		orientation: 'horizontal',
	})

	const gridRoving = useA11yRoving(gridRef, {
		itemSelector: FOCUSABLE,
		cols,
	})

	const handleHeaderKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault()

				if (stopPropagation) e.stopPropagation()

				firstButton(gridRef.current)?.focus()

				return
			}

			headerRoving(e)

			seal(e, stopPropagation)
		},
		[gridRef, headerRoving, stopPropagation],
	)

	const handleGridKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp' && isTopRow(gridRef.current, cols)) {
				e.preventDefault()

				if (stopPropagation) e.stopPropagation()

				middleButton(headerRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowDown' && isBottomRow(gridRef.current, cols)) {
				const target = firstButton(footerRef?.current ?? null)

				if (target) {
					e.preventDefault()

					if (stopPropagation) e.stopPropagation()

					target.focus()

					return
				}
			}

			gridRoving(e)

			seal(e, stopPropagation)
		},
		[gridRef, headerRef, footerRef, cols, gridRoving, stopPropagation],
	)

	const handleFooterKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault()

				if (stopPropagation) e.stopPropagation()

				lastButton(gridRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
				const buttons = Array.from(
					(footerRef?.current ?? null)?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
				)

				const index = buttons.indexOf(document.activeElement as HTMLElement)

				if (index < 0) return

				const next =
					e.key === 'ArrowRight'
						? buttons[(index + 1) % buttons.length]
						: buttons[(index - 1 + buttons.length) % buttons.length]

				if (next) {
					e.preventDefault()

					if (stopPropagation) e.stopPropagation()

					next.focus()
				}
			}

			seal(e, stopPropagation)
		},
		[gridRef, footerRef, stopPropagation],
	)

	return { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown }
}
