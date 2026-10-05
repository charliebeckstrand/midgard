'use client'

import { type CalendarDate, type DateDuration, isSameMonth } from '@internationalized/date'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { flushSync } from 'react-dom'

import { useA11yRoving } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { queryItems } from '../../hooks/a11y/use-a11y-roving'
import { wrap } from '../../utilities'
import { fromCalendarDate, isYearInRange, toCalendarDate } from './calendar-utilities'

/**
 * Selector for focusable day cells. Out-of-range cells render as
 * `<button disabled>`, which can't take focus, so every roving query scopes to
 * enabled buttons and roving skips disabled cells. `.focus()` on a disabled element is a
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

/**
 * The step of each arrow key in a day grid: one day across, or one week down
 * or up. The keys are logical, so `ArrowRight` is the next day in a
 * right-to-left layout too.
 *
 * @internal
 */
const ARROW_STEPS = new Map<string, DateDuration>([
	['ArrowRight', { days: 1 }],
	['ArrowLeft', { days: -1 }],
	['ArrowDown', { weeks: 1 }],
	['ArrowUp', { weeks: -1 }],
])

/**
 * The date model of a day grid that no parent steers. It holds the shown days,
 * the range that the reader can pick, and the view stepper.
 *
 * @internal
 */
type CalendarDayGrid = {
	/** The days of the shown month, in order. The grid holds one button for each day. */
	days: Date[]
	min?: Date
	max?: Date
	/** Moves the view to `month` (0-based) of `year`. */
	navigateTo: (year: number, month: number) => void
}

/** Options for {@link useCalendarFocus}: the three zone refs, grid column count, the grid Tab stop, the seal flag, and the day grid model. @internal */
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
	/**
	 * The date model of a day grid that no parent steers, as in the WAI-ARIA APG
	 * date grid. An arrow that leaves the shown month, and PageUp or PageDown,
	 * move the view through `navigateTo` and focus the new day. Shift with a Page
	 * key moves a year. Leave it unset when a parent steers the grid, and for the
	 * month and year picker.
	 *
	 * The target day of each arrow and Page key is held between `min` and `max`,
	 * and the focus moves to the held day. When that is the focused day, the
	 * focus stays. Thus the arrows never leave the grid for the header or the
	 * footer, and they never wrap.
	 */
	dayGrid?: CalendarDayGrid
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

/** Every day button of a day grid, the disabled days too. @internal */
const DAY_BUTTON = 'button'

/** The step of a Page key in a day grid: a month, or a year with Shift. `null` for every other key. @internal */
function pageStep(event: KeyboardEvent): DateDuration | null {
	const direction = event.key === 'PageDown' ? 1 : event.key === 'PageUp' ? -1 : 0

	if (direction === 0) return null

	return event.shiftKey ? { years: direction } : { months: direction }
}

/** `day` held between the days of `min` and `max`. @internal */
function clampDay(day: CalendarDate, min: Date | undefined, max: Date | undefined): CalendarDate {
	if (min && day.compare(toCalendarDate(min)) < 0) return toCalendarDate(min)

	if (max && day.compare(toCalendarDate(max)) > 0) return toCalendarDate(max)

	return day
}

/**
 * Moves the focus of a day grid by the date model of the key. Each arrow and
 * each Page key move the focus to the target day, held between `min` and
 * `max`. When the held day is the focused day, the focus stays. When the held
 * day is in another month, the view moves there in a synchronous commit
 * first, so that its button is in the DOM.
 *
 * @returns `true` when the key is such a move, or when the focus stays. An
 * arrow to a day of the shown month between `min` and `max` returns `false`,
 * because the roving grid does that move.
 * @internal
 */
function moveDay(
	event: KeyboardEvent,
	grid: HTMLElement | null,
	dayGrid: CalendarDayGrid,
): boolean {
	const page = pageStep(event)

	const step = page ?? ARROW_STEPS.get(logicalArrowKey(event.key, grid))

	if (!step) return false

	const buttons = queryItems(grid, DAY_BUTTON)

	const focused = dayGrid.days[activeIndexIn(buttons)]

	if (!focused) return false

	const from = toCalendarDate(focused)

	const moved = from.add(step)

	const to = clampDay(moved, dayGrid.min, dayGrid.max)

	// The roving grid moves to a day of the shown month between `min` and `max`.
	// Every other target is held in the range here, because the roving grid
	// wraps. A held day that is the focused day keeps the focus where it is.
	if (!page && isSameMonth(moved, from) && to.compare(moved) === 0) return false

	const date = fromCalendarDate(to)

	// The view holds years 1 to 9999 only, so the focus stays at a limit.
	if (!isYearInRange(date.getFullYear())) return true

	if (isSameMonth(to, from)) {
		buttons[to.day - 1]?.focus()

		return true
	}

	flushSync(() => dayGrid.navigateTo(date.getFullYear(), date.getMonth()))

	queryItems(grid, DAY_BUTTON)[to.day - 1]?.focus()

	return true
}

/**
 * Moves the focus across a zone edge of a grid with no date model. ArrowUp on
 * the top row moves it to the header. ArrowDown on the bottom row moves it to
 * the footer, when there is one.
 *
 * @returns `true` when the key crosses a zone edge.
 * @internal
 */
function crossZoneEdge(
	event: KeyboardEvent,
	header: HTMLElement | null,
	grid: HTMLElement | null,
	footer: HTMLElement | null,
	cols: number,
): boolean {
	if (event.key === 'ArrowUp' && isTopRow(grid, cols)) {
		middleButton(header)?.focus()

		return true
	}

	if (event.key !== 'ArrowDown' || !isBottomRow(grid, cols)) return false

	const target = firstButton(footer)

	target?.focus()

	return target !== null
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
 * Wires keyboard navigation across a calendar's header, grid, and footer zones.
 * ArrowDown from the header enters the grid, and ArrowUp from the footer goes
 * back to the grid. The grid is one Tab stop with a roving `tabIndex` (see
 * `activeSelector`). The header buttons are plain buttons, and each one is a
 * Tab stop. Returns the three zones' `keydown` handlers.
 *
 * Without `dayGrid`, ArrowUp on the top row of the grid moves the focus to the
 * header. ArrowDown on the bottom row moves it to the footer, when there is one.
 *
 * With `dayGrid`, the arrows move by date and never leave the grid. An arrow
 * that leaves the month steps the month, and so do the Page keys. That
 * includes ArrowUp on the top row and ArrowDown on the bottom row. The target
 * day is held between `min` and `max`, and the focus stays when the held day is
 * the focused day. Tab and Shift+Tab reach the header and the footer.
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
	dayGrid,
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
			// A day grid moves by date, so its arrows never leave the grid. Only a
			// grid with no date model bridges to the header and the footer.
			const handled = dayGrid
				? moveDay(event, gridRef.current, dayGrid)
				: crossZoneEdge(event, headerRef.current, gridRef.current, footerRef?.current ?? null, cols)

			if (handled) {
				preventAndStop(event, stopPropagation)

				return
			}

			gridRoving(event)

			seal(event, stopPropagation)
		},
		[gridRef, headerRef, footerRef, cols, gridRoving, stopPropagation, dayGrid],
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
