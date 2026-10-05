'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import { useA11yRoving } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { wrap } from '../../utilities'

/**
 * Selector for focusable day cells. Out-of-range cells render as
 * `<button disabled>`, which can't take focus, so every query scopes to enabled
 * buttons and roving skips disabled cells. `.focus()` on a disabled element is a
 * no-op that would freeze the active index at the edge of a disabled range
 * (WCAG 2.1.1).
 *
 * @internal
 */
const FOCUSABLE = 'button:not(:disabled)'

/**
 * Selector for the day that holds the Tab stop of the grid: the selected day,
 * else today when no enabled day is selected. When neither is an enabled day,
 * the roving hook puts the stop on the first enabled day. The hook takes the
 * first day in DOM order that matches, so the `:has()` term keeps the stop off
 * today when a selected day comes after today.
 *
 * @internal
 */
const DAY_TAB_STOP =
	'[aria-selected="true"], :not(:has(> [aria-selected="true"]:not(:disabled))) > [aria-current="date"]'

/**
 * Navigation keys a sealed surface swallows even when no move applies, so a dead
 * key neither scrolls the page nor reaches an outer keyboard model. Also the key
 * set the relative date picker's list-mode roving focus moves on.
 *
 * @internal
 */
export const NAVIGATION_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

/** Options for {@link useCalendarFocus}: the three zone refs, grid column count, the Tab stop of the grid, and the seal flag. @internal */
type CalendarFocusOptions = {
	headerRef: RefObject<HTMLElement | null>
	gridRef: RefObject<HTMLElement | null>
	footerRef?: RefObject<HTMLElement | null>
	cols?: number
	/**
	 * Selector for the grid item that holds the one Tab stop of the grid until
	 * the user moves it. The first enabled item holds the stop when no item
	 * matches. The default is the selected day, else today.
	 */
	activeSelector?: string
	/**
	 * Set to true when the grid is in the DOM. The roving hook puts the Tab stop
	 * on the grid in an effect, so a grid that mounts after the hook, such as the
	 * picker grid in its popover portal, sets this to false until the grid is there.
	 * @defaultValue true
	 */
	gridMounted?: boolean
	/**
	 * Seals the surface: every navigation key stops here, handled or not.
	 * For surfaces nested inside another keyboard model, such as the month/year
	 * picker inside the date picker dialog. There a leaked arrow would
	 * drive the outer model underneath the open surface.
	 */
	stopPropagation?: boolean
}

/** Focusable buttons within `container`, in DOM order. @internal */
function buttonsOf(container: HTMLElement | null): HTMLElement[] {
	return Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
}

/** Index of the active element within `buttons`; `-1` when focus is elsewhere. @internal */
function activeIndexIn(buttons: HTMLElement[]): number {
	return buttons.indexOf(document.activeElement as HTMLElement)
}

/** First focusable button within `container`. @internal */
function firstButton(container: HTMLElement | null): HTMLElement | null {
	return container?.querySelector<HTMLElement>(FOCUSABLE) ?? null
}

/** Middle focusable button within `container`, used to seat focus on a calendar header. @internal */
function middleButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = buttonsOf(container)

	return buttons[Math.floor(buttons.length / 2)] ?? null
}

/** Last focusable button within `container`. @internal */
function lastButton(container: HTMLElement | null): HTMLElement | null {
	return buttonsOf(container).at(-1) ?? null
}

/** True when the active button sits in the grid's first row. @internal */
function isTopRow(container: HTMLElement | null, cols: number): boolean {
	const index = activeIndexIn(buttonsOf(container))

	return index >= 0 && index < cols
}

/** True when the active button sits in the grid's last row. @internal */
function isBottomRow(container: HTMLElement | null, cols: number): boolean {
	const buttons = buttonsOf(container)

	const index = activeIndexIn(buttons)

	if (index < 0) return false

	return index + cols >= buttons.length
}

/**
 * Sealed surfaces consume every navigation key, moved or not. This prevents
 * default on an unhandled navigation key, then stops propagation once the event
 * is defaultPrevented (by this call or an earlier handler). No-op when
 * `stopPropagation` is false.
 *
 * @internal
 */
function seal(event: KeyboardEvent, stopPropagation: boolean): void {
	if (!stopPropagation) return

	if (!event.defaultPrevented && NAVIGATION_KEYS.has(event.key)) event.preventDefault()

	if (event.defaultPrevented) event.stopPropagation()
}

/**
 * Marks a handled cross-surface move: always prevents default, and on a sealed
 * surface also stops propagation.
 *
 * @internal
 */
function preventAndStop(event: KeyboardEvent, stopPropagation: boolean): void {
	event.preventDefault()

	if (stopPropagation) event.stopPropagation()
}

/** Wraps focus between the footer's own buttons on Left/Right. @internal */
function focusAdjacentFooterButton(
	event: KeyboardEvent,
	footer: HTMLElement | null,
	stopPropagation: boolean,
): void {
	const buttons = buttonsOf(footer)

	const index = activeIndexIn(buttons)

	if (index < 0) return

	// The buttons follow the reading order, so the arrows swap in RTL.
	const forward = logicalArrowKey(event.key, footer) === 'ArrowRight'

	const next = buttons[wrap(index + (forward ? 1 : -1), buttons.length)]

	if (!next) return

	preventAndStop(event, stopPropagation)

	next.focus()
}

/**
 * Wires keyboard navigation across a calendar's header, grid, and footer zones,
 * bridging focus between them at the edges. ArrowDown from the header enters
 * the grid, and ArrowUp/Down at the grid's top/bottom row crosses into
 * header/footer. The grid is one Tab stop with a roving `tabIndex` (see
 * `activeSelector`). The header buttons are plain buttons, and each one is a
 * Tab stop. Returns the three zones' `keydown` handlers.
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
	activeSelector = DAY_TAB_STOP,
	gridMounted = true,
	stopPropagation = false,
}: CalendarFocusOptions) {
	const headerRoving = useA11yRoving(headerRef, {
		itemSelector: FOCUSABLE,
		orientation: 'horizontal',
	})

	const gridRoving = useA11yRoving(gridRef, {
		itemSelector: FOCUSABLE,
		cols,
		manageTabIndex: gridMounted,
		activeSelector,
	})

	const handleHeaderKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'ArrowDown') {
				preventAndStop(event, stopPropagation)

				firstButton(gridRef.current)?.focus()

				return
			}

			headerRoving(event)

			seal(event, stopPropagation)
		},
		[gridRef, headerRoving, stopPropagation],
	)

	const handleGridKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'ArrowUp' && isTopRow(gridRef.current, cols)) {
				preventAndStop(event, stopPropagation)

				middleButton(headerRef.current)?.focus()

				return
			}

			if (event.key === 'ArrowDown' && isBottomRow(gridRef.current, cols)) {
				const target = firstButton(footerRef?.current ?? null)

				if (target) {
					preventAndStop(event, stopPropagation)

					target.focus()

					return
				}
			}

			gridRoving(event)

			seal(event, stopPropagation)
		},
		[gridRef, headerRef, footerRef, cols, gridRoving, stopPropagation],
	)

	const handleFooterKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'ArrowUp') {
				preventAndStop(event, stopPropagation)

				lastButton(gridRef.current)?.focus()

				return
			}

			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				focusAdjacentFooterButton(event, footerRef?.current ?? null, stopPropagation)
			}

			seal(event, stopPropagation)
		},
		[gridRef, footerRef, stopPropagation],
	)

	return { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown }
}
