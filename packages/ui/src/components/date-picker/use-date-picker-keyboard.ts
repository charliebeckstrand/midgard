import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { wrap } from '../../utilities'
import type { CalendarActive, CalendarHandle } from '../calendar'
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
	moveGridDate: (delta: number) => Date
	moveGridMonths: (delta: number) => Date
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
type DatePickerKeyContext = {
	setActive: (next: CalendarActive | null) => void
	closeCalendar: () => void
	moveGridDate: (delta: number) => Date
	moveGridMonths: (delta: number) => Date
	getInitialActiveDate: () => Date
	getViewEntryDate: () => Date | null
	handleSelect: (date: Date) => void
	calendarRef: RefObject<CalendarHandle | null>
	footerButtons: FooterButton[]
	onFooterActivate: FooterAction
}

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
 * `getInitialActiveDate` starts Enter, Space, and the Page keys with no
 * highlight on `anchor`, else on today, and `min` and `max` bound it. With no
 * calendar mounted, `getViewEntryDate` gives the same day.
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
 * Handles keys that apply in any zone while the calendar is open (Escape,
 * Shift+Arrow jumps, PageUp/PageDown month/year paging).
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

	// APG date-grid: PageUp/PageDown move a month, Shift+Page a year. The
	// highlight materializes on the moved date when none exists yet, and the
	// calendar view re-anchors to follow it.
	if (event.key === 'PageUp' || event.key === 'PageDown') {
		event.preventDefault()

		const direction = event.key === 'PageUp' ? -1 : 1

		const next = ctx.moveGridMonths(event.shiftKey ? direction * 12 : direction)

		ctx.setActive({ zone: 'grid', date: next })

		return true
	}

	return false
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

/** Day delta per arrow key in the grid zone: a column left/right, a week up/down. @internal */
const GRID_DELTAS: Record<string, number> = {
	ArrowLeft: -1,
	ArrowRight: 1,
	ArrowUp: -7,
	ArrowDown: 7,
}

/** Grid-zone keys: arrows move the highlight by day/week, Enter/Space selects. @internal */
function handleGridKey(
	event: KeyboardEvent<HTMLElement>,
	key: string,
	active: GridActive,
	ctx: DatePickerKeyContext,
) {
	const delta = GRID_DELTAS[key]

	if (delta !== undefined) {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(delta) })

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
 * The zone of a toolbar button that has DOM focus. The user can Tab to a
 * header or footer button, and the dialog then gets the key from that button.
 * The button then acts as its zone of the model, at the index in its
 * `data-index` attribute.
 *
 * @returns The zone, or `null` when the key comes from the element that holds
 * the handler, or from an element outside the two toolbars.
 * @internal
 */
function zoneOfTarget(event: KeyboardEvent<HTMLElement>): CalendarActive | null {
	const { target, currentTarget } = event

	if (!(target instanceof Element) || target === currentTarget) return null

	const toolbar = target.closest<HTMLElement>(TOOLBAR_SELECTOR)

	const control = target.closest<HTMLElement>('[data-index]')

	if (!toolbar || !control || !toolbar.contains(control)) return null

	const index = Number(control.dataset.index)

	if (toolbar.dataset.slot === 'calendar-footer') return { zone: 'footer', index }

	return { zone: 'header', index: index as 0 | 1 | 2 }
}

/**
 * Whether `mapped` gives a toolbar control that is not `active`.
 *
 * @returns `false` when `mapped` is `null` or has the zone and the index of
 * `active`.
 * @internal
 */
function isNewControl(
	active: CalendarActive | null,
	mapped: CalendarActive | null,
): mapped is CalendarActive {
	if (mapped === null) return false

	return !(
		active?.zone === mapped.zone &&
		'index' in active &&
		'index' in mapped &&
		active.index === mapped.index
	)
}

/**
 * Builds the date picker's `keydown` handler, dispatching to the closed,
 * global, and per-zone (grid/header/footer) key handlers by current `open` and
 * `active` state.
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
	moveGridDate,
	moveGridMonths,
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
				moveGridDate,
				moveGridMonths,
				getInitialActiveDate,
				getViewEntryDate,
				handleSelect,
				calendarRef,
				footerButtons,
				onFooterActivate,
			}

			if (handleOpenGlobalKey(event, ctx)) return

			// A toolbar button with DOM focus sets the zone of the model. Only a
			// different zone or index sets it again.
			const mapped = zoneOfTarget(event)

			if (isNewControl(active, mapped)) setActive(mapped)

			const current = mapped ?? active

			if (current === null) {
				handleNoActiveKey(event, ctx, input)

				return
			}

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
		},
		[
			disabled,
			open,
			input,
			active,
			setActive,
			openCalendar,
			closeCalendar,
			moveGridDate,
			moveGridMonths,
			getInitialActiveDate,
			getViewEntryDate,
			handleSelect,
			calendarRef,
			footerButtons,
			onFooterActivate,
		],
	)
}
