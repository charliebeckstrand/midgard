import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import type { CalendarActive, CalendarHandle } from '../calendar'

/** A footer action button in the date picker. */
export type FooterButton = 'clear' | 'today'

/** Activates a footer button. @internal */
type FooterAction = (kind: FooterButton) => void

/** Options for {@link useDatePickerKeyboard}. @internal */
type DatePickerKeyDownParams = {
	disabled: boolean
	open: boolean
	active: CalendarActive | null
	setActive: (next: CalendarActive | null) => void
	openCalendar: () => void
	closeCalendar: () => void
	moveGridDate: (delta: number) => Date
	moveGridMonths: (delta: number) => Date
	getInitialActiveDate: () => Date
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

/** True for any of the four arrow keys. @internal */
function isArrowKey(key: string): boolean {
	return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
}

/** While closed, ArrowDown/ArrowUp/Enter/Space open the calendar. @internal */
function handleClosedKey(event: KeyboardEvent<HTMLElement>, openCalendar: () => void) {
	if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
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
 * Handles keys with no highlight yet: the first arrow seeds the grid,
 * Enter/Space selects the initial date, everything else is inert.
 *
 * @internal
 */
function handleNoActiveKey(event: KeyboardEvent<HTMLElement>, ctx: DatePickerKeyContext) {
	if (isArrowKey(event.key)) {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })

		return
	}

	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()

		ctx.handleSelect(ctx.getInitialActiveDate())
	}
}

/** Grid-zone keys: arrows move the highlight by day/week, Enter/Space selects. @internal */
function handleGridKey(
	event: KeyboardEvent<HTMLElement>,
	active: GridActive,
	ctx: DatePickerKeyContext,
) {
	if (event.key === 'ArrowLeft') {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(-1) })

		return
	}

	if (event.key === 'ArrowRight') {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(1) })

		return
	}

	if (event.key === 'ArrowUp') {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(-7) })

		return
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(7) })

		return
	}

	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()

		ctx.handleSelect(active.date)
	}
}

/** Header-zone keys: Left/Right cycle the three controls, Down enters the grid, Enter/Space activates. @internal */
function handleHeaderKey(
	event: KeyboardEvent<HTMLElement>,
	active: HeaderActive,
	ctx: DatePickerKeyContext,
) {
	if (event.key === 'ArrowLeft') {
		event.preventDefault()

		const nextIndex = active.index === 0 ? 2 : ((active.index - 1) as 0 | 1 | 2)

		ctx.setActive({ zone: 'header', index: nextIndex })

		return
	}

	if (event.key === 'ArrowRight') {
		event.preventDefault()

		const nextIndex = active.index === 2 ? 0 : ((active.index + 1) as 0 | 1 | 2)

		ctx.setActive({ zone: 'header', index: nextIndex })

		return
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })

		return
	}

	if (event.key === 'ArrowUp') {
		event.preventDefault()

		return
	}

	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()

		if (active.index === 0) ctx.calendarRef.current?.prevMonth()
		else if (active.index === 1) ctx.calendarRef.current?.openPicker()
		else ctx.calendarRef.current?.nextMonth()
	}
}

/** Footer-zone keys: Left/Right wrap between buttons, Up returns to the grid, Enter/Space activates. @internal */
function handleFooterKey(
	event: KeyboardEvent<HTMLElement>,
	active: FooterActive,
	ctx: DatePickerKeyContext,
) {
	const count = ctx.footerButtons.length

	// Left/Right wrap symmetrically; `(index + delta + count) % count` covers
	// both edges (0 → count-1 going left, count-1 → 0 going right).
	if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
		event.preventDefault()

		if (count === 0) return

		const delta = event.key === 'ArrowLeft' ? -1 : 1

		ctx.setActive({ zone: 'footer', index: (active.index + delta + count) % count })

		return
	}

	if (event.key === 'ArrowUp') {
		event.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })

		return
	}

	if (event.key === 'ArrowDown') {
		event.preventDefault()

		return
	}

	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()

		const kind = ctx.footerButtons[active.index]

		if (kind) ctx.onFooterActivate(kind)
	}
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
	active,
	setActive,
	openCalendar,
	closeCalendar,
	moveGridDate,
	moveGridMonths,
	getInitialActiveDate,
	handleSelect,
	calendarRef,
	footerButtons,
	onFooterActivate,
}: DatePickerKeyDownParams) {
	return useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (disabled) return

			if (!open) {
				handleClosedKey(event, openCalendar)

				return
			}

			const ctx: DatePickerKeyContext = {
				setActive,
				closeCalendar,
				moveGridDate,
				moveGridMonths,
				getInitialActiveDate,
				handleSelect,
				calendarRef,
				footerButtons,
				onFooterActivate,
			}

			if (handleOpenGlobalKey(event, ctx)) return

			if (active === null) {
				handleNoActiveKey(event, ctx)

				return
			}

			if (active.zone === 'grid') {
				handleGridKey(event, active, ctx)

				return
			}

			if (active.zone === 'header') {
				handleHeaderKey(event, active, ctx)

				return
			}

			handleFooterKey(event, active, ctx)
		},
		[
			disabled,
			open,
			active,
			setActive,
			openCalendar,
			closeCalendar,
			moveGridDate,
			moveGridMonths,
			getInitialActiveDate,
			handleSelect,
			calendarRef,
			footerButtons,
			onFooterActivate,
		],
	)
}
