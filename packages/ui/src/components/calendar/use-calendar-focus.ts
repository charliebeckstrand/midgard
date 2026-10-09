'use client'

import { isSameMonth } from '@internationalized/date'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { flushSync } from 'react-dom'

import { useA11yRoving } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { queryItems, rovedStop } from '../../hooks/a11y/use-a11y-roving'
import { wrap } from '../../utilities'
import {
	clampDay,
	fromCalendarDate,
	gridStep,
	isSameDay,
	stepDay,
	toCalendarDate,
} from './calendar-utilities'

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
 * today when a selected day comes after today. {@link dayTabStop} states the
 * same rule from the date model. When you change one, change the other.
 *
 * @internal
 */
const DAY_TAB_STOP =
	'[aria-selected="true"], :not(:has(> [aria-selected="true"]:not(:disabled))) > [aria-current="date"]'

/**
 * The day that holds the Tab stop of the grid, from the date model. It states
 * the rule of {@link DAY_TAB_STOP} and the roving hook again, without the DOM.
 * The day is the first selected day that is enabled, else today when it is
 * enabled and in `days`, else the first enabled day. When `isSelected` marks
 * more than one day, as for a range, the first selected day in `days` is the
 * earlier one.
 *
 * @param days - The days of the shown month, in order.
 * @param today - Today, or `null` before hydration.
 * @returns The day from `days`, or `null` when `days` holds no enabled day.
 * @internal
 */
export function dayTabStop(
	days: readonly Date[],
	today: Date | null,
	isDisabled: (date: Date) => boolean,
	isSelected: (date: Date) => boolean,
): Date | null {
	const enabled = days.filter((date) => !isDisabled(date))

	const todayCell = today ? enabled.find((date) => isSameDay(date, today)) : undefined

	return enabled.find(isSelected) ?? todayCell ?? enabled[0] ?? null
}

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

/** Options for {@link useCalendarFocus}: the three zone refs, grid column count, the grid Tab stop, the seal flag, the steer flag, and the day grid model. @internal */
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
	 * Set to true when a parent steers the calendar, as the date picker does.
	 * The header, grid, and footer handlers then leave every key to the parent.
	 * They move no focus and call no `preventDefault`, so the key gets to the
	 * keyboard model of the parent. The grid keeps its one Tab stop.
	 * @defaultValue false
	 */
	steered?: boolean
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

/** Middle focusable button within `container`, used to seat focus on a calendar header. @internal */
function middleButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = buttonsOf(container)

	return buttons[Math.floor(buttons.length / 2)] ?? null
}

/**
 * The focusable button of `grid` where the focus enters, as Tab enters. While
 * roving manages the Tab stop (`managed`), this is the button with
 * `tabIndex=0`: the roved button, else the button that roving seated. Else it
 * is the button that `activeSelector` names. When no button matches, the
 * `fallback` edge gives the first or the last button.
 *
 * @internal
 */
function entryButton(
	grid: HTMLElement | null,
	activeSelector: string,
	managed: boolean,
	fallback: 'first' | 'last',
): HTMLElement | null {
	const buttons = buttonsOf(grid)

	return (
		(managed ? rovedStop(buttons) : undefined) ??
		buttons.find((button) => button.matches(activeSelector)) ??
		(fallback === 'first' ? buttons[0] : buttons.at(-1)) ??
		null
	)
}

/** True when the active button sits in the grid's first row. @internal */
function isTopRow(container: HTMLElement | null, cols: number): boolean {
	const index = activeIndexIn(buttonsOf(container))

	return index >= 0 && index < cols
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
	const step = gridStep(event, grid)

	if (!step) return false

	const page = event.key === 'PageUp' || event.key === 'PageDown'

	const buttons = queryItems(grid, DAY_BUTTON)

	const focused = dayGrid.days[activeIndexIn(buttons)]

	if (!focused) return false

	const from = toCalendarDate(focused)

	const moved = stepDay(from, step)

	// The view holds years 1 to 9999 only, so the focus stays at a limit.
	if (!moved) return true

	const to = clampDay(moved, dayGrid.min, dayGrid.max)

	// The roving grid moves to a day of the shown month between `min` and `max`.
	// Every other target is held in the range here, because the roving grid
	// wraps. A held day that is the focused day keeps the focus where it is.
	if (!page && isSameMonth(moved, from) && to.compare(moved) === 0) return false

	const date = fromCalendarDate(to)

	if (isSameMonth(to, from)) {
		buttons[to.day - 1]?.focus()

		return true
	}

	flushSync(() => dayGrid.navigateTo(date.getFullYear(), date.getMonth()))

	queryItems(grid, DAY_BUTTON)[to.day - 1]?.focus()

	return true
}

/**
 * Moves the focus from the top row of a grid with no date model to the header.
 * The other keys stay in the grid.
 *
 * @returns `true` when the key is ArrowUp on the top row.
 * @internal
 */
function crossToHeader(
	event: KeyboardEvent,
	header: HTMLElement | null,
	grid: HTMLElement | null,
	cols: number,
): boolean {
	if (event.key !== 'ArrowUp' || !isTopRow(grid, cols)) return false

	middleButton(header)?.focus()

	return true
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

/** Does nothing. A steered zone leaves each key to the parent. @internal */
function ignoreKey(): void {}

/**
 * The handlers of a steered calendar. They move no focus and call no
 * `preventDefault`, so each key gets to the keyboard model of the parent.
 *
 * @internal
 */
const STEERED_HANDLERS = Object.freeze({
	handleHeaderKeyDown: ignoreKey,
	handleGridKeyDown: ignoreKey,
	handleFooterKeyDown: ignoreKey,
})

/**
 * Wires keyboard navigation across a calendar's header, grid, and footer zones.
 * The grid is one Tab stop with a roving `tabIndex` (see `activeSelector`).
 * The header buttons are plain buttons, and each one is a Tab stop. Returns
 * the three zones' `keydown` handlers.
 *
 * ArrowDown from the header and ArrowUp from the footer move the focus to the
 * grid item that holds the Tab stop, so they enter on the same item as Tab
 * ({@link entryButton} gives the rule). With `steered`, the hook returns
 * handlers that leave every key to the parent.
 *
 * Without `dayGrid`, ArrowUp on the top row of the grid moves the focus to the
 * header. No arrow moves the focus from the grid to the footer.
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
	steered = false,
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

				entryButton(gridRef.current, activeSelector, gridMounted, 'first')?.focus()

				return
			}

			headerRoving(event)

			seal(event, stopPropagation)
		},
		[gridRef, headerRoving, stopPropagation, activeSelector, gridMounted],
	)

	const handleGridKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// A day grid moves by date, so its arrows never leave the grid. Only a
			// grid with no date model bridges to the header.
			const handled = dayGrid
				? moveDay(event, gridRef.current, dayGrid)
				: crossToHeader(event, headerRef.current, gridRef.current, cols)

			if (handled) {
				preventAndStop(event, stopPropagation)

				return
			}

			gridRoving(event)

			seal(event, stopPropagation)
		},
		[gridRef, headerRef, cols, gridRoving, stopPropagation, dayGrid],
	)

	const handleFooterKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'ArrowUp') {
				preventAndStop(event, stopPropagation)

				entryButton(gridRef.current, activeSelector, gridMounted, 'last')?.focus()

				return
			}

			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				focusAdjacentFooterButton(event, footerRef?.current ?? null, stopPropagation)
			}

			seal(event, stopPropagation)
		},
		[gridRef, footerRef, stopPropagation, activeSelector, gridMounted],
	)

	return steered
		? STEERED_HANDLERS
		: { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown }
}
