'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import { useA11yRoving } from '../../hooks'

/**
 * Selector for focusable day cells. Out-of-range cells render as
 * `<button disabled>`, which can't take focus, so every query scopes to enabled
 * buttons and roving skips disabled cells; `.focus()` on a disabled element is a
 * no-op that would freeze the active index at the edge of a disabled range
 * (WCAG 2.1.1).
 *
 * @internal
 */
const FOCUSABLE = 'button:not(:disabled)'

/**
 * Navigation keys a sealed surface swallows even when no move applies, so a dead
 * key neither scrolls the page nor reaches an outer keyboard model.
 *
 * @internal
 */
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

/** Options for {@link useCalendarFocus}: the three zone refs, grid column count, and the seal flag. @internal */
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

/** First focusable button within `container`. @internal */
function firstButton(container: HTMLElement | null): HTMLElement | null {
	return container?.querySelector<HTMLElement>(FOCUSABLE) ?? null
}

/** Middle focusable button within `container`, used to seat focus on a calendar header. @internal */
function middleButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

	return buttons[Math.floor(buttons.length / 2)] ?? null
}

/** Last focusable button within `container`. @internal */
function lastButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = container?.querySelectorAll<HTMLElement>(FOCUSABLE)

	if (!buttons?.length) return null

	return buttons.item(buttons.length - 1)
}

/** True when the active button sits in the grid's first row. @internal */
function isTopRow(container: HTMLElement | null, cols: number): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	return index >= 0 && index < cols
}

/** True when the active button sits in the grid's last row. @internal */
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

/**
 * Marks a handled cross-surface move: always prevents default, and on a sealed
 * surface also stops propagation.
 *
 * @internal
 */
function preventAndStop(e: KeyboardEvent, stopPropagation: boolean): void {
	e.preventDefault()

	if (stopPropagation) e.stopPropagation()
}

/** Wraps focus between the footer's own buttons on Left/Right. @internal */
function focusAdjacentFooterButton(
	e: KeyboardEvent,
	footer: HTMLElement | null,
	stopPropagation: boolean,
): void {
	const buttons = Array.from(footer?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	if (index < 0) return

	const next =
		e.key === 'ArrowRight'
			? buttons[(index + 1) % buttons.length]
			: buttons[(index - 1 + buttons.length) % buttons.length]

	if (!next) return

	preventAndStop(e, stopPropagation)

	next.focus()
}

/**
 * Wires roving-tabindex keyboard navigation across a calendar's header, grid,
 * and footer zones, bridging focus between them at the edges (ArrowDown from the
 * header enters the grid, ArrowUp/Down at the grid's top/bottom row crosses into
 * header/footer). Returns the three zones' `keydown` handlers.
 *
 * @returns `handleHeaderKeyDown` / `handleGridKeyDown` / `handleFooterKeyDown`.
 * @remarks Set `stopPropagation` to seal a surface nested inside another
 * keyboard model, where a leaked arrow would drive the outer model.
 */
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
				preventAndStop(e, stopPropagation)

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
				preventAndStop(e, stopPropagation)

				middleButton(headerRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowDown' && isBottomRow(gridRef.current, cols)) {
				const target = firstButton(footerRef?.current ?? null)

				if (target) {
					preventAndStop(e, stopPropagation)

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
				preventAndStop(e, stopPropagation)

				lastButton(gridRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
				focusAdjacentFooterButton(e, footerRef?.current ?? null, stopPropagation)
			}

			seal(e, stopPropagation)
		},
		[gridRef, footerRef, stopPropagation],
	)

	return { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown }
}
