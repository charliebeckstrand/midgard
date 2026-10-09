import type { DateDuration } from '@internationalized/date'
import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { wrap } from '../../utilities'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { DAY_KEY_SELECTOR, dayOfKey, gridStep, isSameDay } from '../calendar/calendar-utilities'
import { clampDate } from './date-picker-utilities'

/** A footer action button in the date picker. */
export type FooterButton = 'clear' | 'today'

/** Activates a footer button. @internal */
type FooterAction = (kind: FooterButton) => void

/** Options for {@link useDatePickerKeyboard}. @internal */
type DatePickerKeyDownParams = {
	disabled: boolean
	open: boolean
	/**
	 * `input` mode keeps DOM focus on the editable DateInput rather than the
	 * dialog, so the same keydown stream drives the calendar and the text field.
	 * Enter/Space are left to the input (Enter commits, Space is inert), except
	 * when a grid day is highlighted. Only the vertical arrows open a closed
	 * calendar; the button-trigger variant opens on Enter/Space too.
	 */
	input?: boolean
	active: CalendarActive | null
	setActive: (next: CalendarActive | null) => void
	openCalendar: () => void
	closeCalendar: () => void
	/** The day `step` days or months from `from`, held between `min` and `max`. */
	moveGrid: (step: DateDuration, from: Date) => Date
	getInitialActiveDate: () => Date
	/**
	 * The day where an arrow key moves the highlight into the grid: from the
	 * header, from the footer, or with no highlight. The calendar gives it from
	 * the month that it shows, which header paging can move away from the value.
	 * It is `null` when that month holds no enabled day.
	 */
	getViewEntryDate: () => Date | null
	handleSelect: (date: Date) => void
	calendarRef: RefObject<CalendarHandle | null>
	footerButtons: FooterButton[]
	onFooterActivate: FooterAction
}

/**
 * Shared dependencies threaded to the per-zone handlers below. Bundled into one
 * object so each handler keeps a flat signature instead of a dozen parameters.
 *
 * @internal
 */
type DatePickerKeyContext = Omit<
	DatePickerKeyDownParams,
	'disabled' | 'open' | 'input' | 'active' | 'openCalendar'
>

/** Active state narrowed to the grid zone. @internal */
type GridActive = Extract<CalendarActive, { zone: 'grid' }>
/** Active state narrowed to the header zone. @internal */
type HeaderActive = Extract<CalendarActive, { zone: 'header' }>
/** Active state narrowed to the footer zone. @internal */
type FooterActive = Extract<CalendarActive, { zone: 'footer' }>

/**
 * The two seeds of the grid highlight. `getViewEntryDate` starts the arrow keys
 * on the entry day of the calendar (`CalendarHandle.getEntryDate`). That day is
 * in the month that the calendar shows, which header paging can move away from
 * `anchor`. It is `null` when that month holds no enabled day.
 * `getInitialActiveDate` gives `anchor`, else today, and `min` and `max` bound
 * it. It starts Enter and Space with no highlight, and the Page keys from the
 * header, the footer, or no highlight. With no highlight, it also starts the
 * arrow keys when the entry day is `null`. With no calendar mounted,
 * `getViewEntryDate` gives the same day.
 *
 * @param anchor - The selected day: the value, or the start of a range in progress.
 * @internal
 */
export function useDatePickerGridEntry(
	anchor: Date | null | undefined,
	min: Date | undefined,
	max: Date | undefined,
	calendarRef: RefObject<CalendarHandle | null>,
) {
	const getInitialActiveDate = useCallback(
		() => clampDate(anchor ?? new Date(), min, max),
		[anchor, min, max],
	)

	const getViewEntryDate = useCallback(() => {
		const calendar = calendarRef.current

		return calendar ? calendar.getEntryDate() : getInitialActiveDate()
	}, [calendarRef, getInitialActiveDate])

	return { getInitialActiveDate, getViewEntryDate }
}

/**
 * The keys that move the model: the four arrows and the Page keys. The dialog
 * takes focus back from a focused control for these keys, and a focused
 * toolbar button or day button then acts as its zone of the model.
 *
 * @internal
 */
export const RECLAIM_KEYS: ReadonlySet<string> = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'PageUp',
	'PageDown',
])

/** True for any of the four arrow keys. @internal */
function isArrowKey(key: string): boolean {
	return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
}

/**
 * While closed, opens the calendar. The button-trigger variant opens on
 * ArrowDown/ArrowUp/Enter/Space. `input` mode opens only on the vertical arrows,
 * leaving Enter (commit typed text) and Space (inert in the numeric field) to
 * the DateInput.
 *
 * @internal
 */
function handleClosedKey(
	event: KeyboardEvent<HTMLElement>,
	openCalendar: () => void,
	input: boolean,
) {
	const openKeys = input ? ['ArrowDown', 'ArrowUp'] : ['ArrowDown', 'ArrowUp', 'Enter', ' ']

	if (openKeys.includes(event.key)) {
		event.preventDefault()

		openCalendar()
	}
}

/**
 * Handles keys that apply in any zone while the calendar is open: Escape and
 * the Shift+Arrow jumps.
 *
 * @returns `true` once a key is consumed so the caller can skip zone dispatch.
 * @internal
 */
function handleOpenGlobalKey(
	event: KeyboardEvent<HTMLElement>,
	ctx: DatePickerKeyContext,
): boolean {
	if (event.key === 'Escape') {
		event.preventDefault()

		ctx.closeCalendar()

		return true
	}

	// Shift+ArrowUp jumps to the toolbar from anywhere; Shift+ArrowDown jumps to the footer.
	if (event.shiftKey && event.key === 'ArrowUp') {
		event.preventDefault()

		ctx.setActive({ zone: 'header', index: 1 })

		return true
	}

	if (event.shiftKey && event.key === 'ArrowDown') {
		event.preventDefault()

		if (ctx.footerButtons.length > 0) ctx.setActive({ zone: 'footer', index: 0 })

		return true
	}

	return false
}

/**
 * APG date grid: PageUp and PageDown move a month, and Shift with a Page key
 * moves a year. The move starts on the day of a grid `current`. From the header
 * zone, the footer zone, or no highlight, the move starts on the anchor. The
 * highlight goes on the day that the move gives, and the view moves to it.
 *
 * @param current - The zone of the model, or the zone of the focused control.
 * @returns `true` when the key is a Page key.
 * @internal
 */
function handlePageKey(
	event: KeyboardEvent<HTMLElement>,
	current: CalendarActive | null,
	ctx: DatePickerKeyContext,
): boolean {
	const step =
		event.key === 'PageUp' || event.key === 'PageDown' ? gridStep(event, event.currentTarget) : null

	if (!step) return false

	event.preventDefault()

	const from = current?.zone === 'grid' ? current.date : ctx.getInitialActiveDate()

	const next = ctx.moveGrid(step, from)

	ctx.setActive({ zone: 'grid', date: next })

	return true
}

/**
 * Handles keys with no highlight. The first arrow puts the highlight on the
 * entry day of the shown month. When that month holds no enabled day, the
 * highlight goes on the anchor, and the view moves to it. Enter and Space
 * select the anchor. Other keys do nothing.
 *
 * In `input` mode, no highlight means that the user edits text. Enter thus
 * goes to the DateInput, which commits the text, and Space does nothing. The
 * committing Enter closes an open calendar, so that it does not stay behind
 * the field. The arrow keys still put the highlight in the grid.
 *
 * @internal
 */
function handleNoActiveKey(
	event: KeyboardEvent<HTMLElement>,
	ctx: DatePickerKeyContext,
	input: boolean,
) {
	if (isArrowKey(event.key)) {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getViewEntryDate() ?? ctx.getInitialActiveDate() })

		return
	}

	if (event.key === 'Enter' || event.key === ' ') {
		if (input) {
			// Do not `preventDefault`: the DateInput's own Enter handler must still
			// run to commit/blur (`composeEventHandlers` skips it once defaulted).
			if (event.key === 'Enter') ctx.closeCalendar()

			return
		}

		event.preventDefault()

		ctx.handleSelect(ctx.getInitialActiveDate())
	}
}

/**
 * Grid-zone keys: arrows move the highlight by day/week from `active.date`,
 * Enter/Space selects. `active` can be a focused day button that the model
 * does not show yet, so the step starts on its date.
 *
 * @internal
 */
function handleGridKey(
	event: KeyboardEvent<HTMLElement>,
	key: string,
	active: GridActive,
	ctx: DatePickerKeyContext,
) {
	const step = isArrowKey(key) ? gridStep(event, event.currentTarget) : null

	if (step) {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGrid(step, active.date) })

		return
	}

	if (key === 'Enter' || key === ' ') {
		event.preventDefault()

		ctx.handleSelect(active.date)
	}
}

/**
 * Header-zone keys: Left/Right cycle the three controls, Down enters the grid
 * in the shown month, Enter/Space activates. When the shown month holds no
 * enabled day, Down does nothing.
 *
 * @internal
 */
function handleHeaderKey(
	event: KeyboardEvent<HTMLElement>,
	key: string,
	active: HeaderActive,
	ctx: DatePickerKeyContext,
) {
	// Left/Right wrap across the three controls.
	if (key === 'ArrowLeft' || key === 'ArrowRight') {
		event.preventDefault()

		const delta = key === 'ArrowLeft' ? -1 : 1

		ctx.setActive({ zone: 'header', index: wrap(active.index + delta, 3) as 0 | 1 | 2 })

		return
	}

	if (key === 'ArrowDown') {
		event.preventDefault()

		const date = ctx.getViewEntryDate()

		if (date) ctx.setActive({ zone: 'grid', date })

		return
	}

	if (key === 'ArrowUp') {
		event.preventDefault()

		return
	}

	if (key === 'Enter' || key === ' ') {
		event.preventDefault()

		if (active.index === 0) ctx.calendarRef.current?.prevMonth()
		else if (active.index === 1) ctx.calendarRef.current?.openPicker()
		else ctx.calendarRef.current?.nextMonth()
	}
}

/**
 * Footer-zone keys: Left/Right wrap between buttons, Up returns to the grid in
 * the shown month, Enter/Space activates. When the shown month holds no
 * enabled day, Up does nothing.
 *
 * @internal
 */
function handleFooterKey(
	event: KeyboardEvent<HTMLElement>,
	key: string,
	active: FooterActive,
	ctx: DatePickerKeyContext,
) {
	const count = ctx.footerButtons.length

	// Left/Right wrap at both edges: 0 goes to count-1, and count-1 goes to 0.
	if (key === 'ArrowLeft' || key === 'ArrowRight') {
		event.preventDefault()

		if (count === 0) return

		const delta = key === 'ArrowLeft' ? -1 : 1

		ctx.setActive({ zone: 'footer', index: wrap(active.index + delta, count) })

		return
	}

	if (key === 'ArrowUp') {
		event.preventDefault()

		const date = ctx.getViewEntryDate()

		if (date) ctx.setActive({ zone: 'grid', date })

		return
	}

	if (key === 'ArrowDown') {
		event.preventDefault()

		return
	}

	if (key === 'Enter' || key === ' ') {
		event.preventDefault()

		const kind = ctx.footerButtons[active.index]

		if (kind) ctx.onFooterActivate(kind)
	}
}

/** The toolbars of the calendar whose buttons map to a zone of the model. @internal */
const TOOLBAR_SELECTOR = '[data-slot="calendar-header"], [data-slot="calendar-footer"]'

/**
 * The grid zone of a day button, at the day of its `data-date` key.
 *
 * @returns The zone, or `null` when `target` is not in a day button inside
 * `container`.
 * @internal
 */
function dayOfTarget(target: Element, container: Element): CalendarActive | null {
	const day = target.closest<HTMLElement>(DAY_KEY_SELECTOR)

	const key = day && container.contains(day) ? day.dataset.date : undefined

	return key ? { zone: 'grid', date: dayOfKey(key) } : null
}

/**
 * The zone of a toolbar button or a day button that has DOM focus. The user
 * can Tab to a header or footer button, or to the Tab stop of the day grid, and
 * the dialog then gets the key from that button. On an arrow key or a Page key
 * ({@link RECLAIM_KEYS}), the button then acts as its zone of the model. A
 * toolbar button gives the index in its `data-index` attribute, and a day
 * button gives its date. The dialog takes focus back only for these keys, so
 * other keys, such as Tab, Home, and End, do not move the highlight.
 *
 * @returns The zone, or `null` when the key is not in {@link RECLAIM_KEYS},
 * or comes from the element that holds the handler, or from an element outside
 * the two toolbars and the day buttons.
 * @internal
 */
function zoneOfTarget(event: KeyboardEvent<HTMLElement>): CalendarActive | null {
	const { target, currentTarget } = event

	if (!RECLAIM_KEYS.has(event.key) || !(target instanceof Element) || target === currentTarget) {
		return null
	}

	const toolbar = target.closest<HTMLElement>(TOOLBAR_SELECTOR)

	if (!toolbar) return dayOfTarget(target, currentTarget)

	const control = target.closest<HTMLElement>('[data-index]')

	if (!control || !toolbar.contains(control)) return null

	const index = Number(control.dataset.index)

	if (toolbar.dataset.slot === 'calendar-footer') return { zone: 'footer', index }

	return { zone: 'header', index: index as 0 | 1 | 2 }
}

/**
 * Whether `mapped` gives a toolbar control or a day that is not `active`.
 *
 * @returns `false` when `mapped` is `null`, or has the zone of `active` and
 * its index or its day.
 * @internal
 */
function isNewControl(
	active: CalendarActive | null,
	mapped: CalendarActive | null,
): mapped is CalendarActive {
	if (mapped === null) return false

	if (active === null) return true

	if (mapped.zone === 'grid') return active.zone !== 'grid' || !isSameDay(active.date, mapped.date)

	return mapped.zone !== active.zone || !('index' in active) || mapped.index !== active.index
}

/**
 * Sends a key to the handler of the `current` zone: the grid, the header, or
 * the footer.
 *
 * @internal
 */
function handleZoneKey(
	event: KeyboardEvent<HTMLElement>,
	current: CalendarActive,
	ctx: DatePickerKeyContext,
) {
	// The day grid and the header and footer rows follow the reading order,
	// so the arrows swap in RTL.
	const key = logicalArrowKey(event.key, event.currentTarget)

	if (current.zone === 'grid') {
		handleGridKey(event, key, current, ctx)

		return
	}

	if (current.zone === 'header') {
		handleHeaderKey(event, key, current, ctx)

		return
	}

	handleFooterKey(event, key, current, ctx)
}

/**
 * Builds the date picker's `keydown` handler, dispatching to the closed,
 * global, and per-zone (grid/header/footer) key handlers by current `open` and
 * `active` state. On an arrow or a Page key, a toolbar button or a day button
 * with DOM focus first sets the zone ({@link zoneOfTarget}). The Page keys then
 * go to {@link handlePageKey} from each zone, and from no highlight.
 *
 * @returns A memoized `keydown` handler for the picker root.
 */
export function useDatePickerKeyboard({
	disabled,
	open,
	input = false,
	active,
	setActive,
	openCalendar,
	closeCalendar,
	moveGrid,
	getInitialActiveDate,
	getViewEntryDate,
	handleSelect,
	calendarRef,
	footerButtons,
	onFooterActivate,
}: DatePickerKeyDownParams) {
	return useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (disabled) return

			if (!open) {
				handleClosedKey(event, openCalendar, input)

				return
			}

			const ctx: DatePickerKeyContext = {
				setActive,
				closeCalendar,
				moveGrid,
				getInitialActiveDate,
				getViewEntryDate,
				handleSelect,
				calendarRef,
				footerButtons,
				onFooterActivate,
			}

			if (handleOpenGlobalKey(event, ctx)) return

			// On an arrow or a Page key, a toolbar button or a day button with DOM
			// focus sets the zone of the model. Only a different zone, index, or day
			// sets it again.
			const mapped = zoneOfTarget(event)

			if (isNewControl(active, mapped)) setActive(mapped)

			const current = mapped ?? active

			if (handlePageKey(event, current, ctx)) return

			if (current === null) {
				handleNoActiveKey(event, ctx, input)

				return
			}

			handleZoneKey(event, current, ctx)
		},
		[
			disabled,
			open,
			input,
			active,
			setActive,
			openCalendar,
			closeCalendar,
			moveGrid,
			getInitialActiveDate,
			getViewEntryDate,
			handleSelect,
			calendarRef,
			footerButtons,
			onFooterActivate,
		],
	)
}
