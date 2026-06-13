import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import type { CalendarActive, CalendarHandle } from '../calendar'

export type FooterButton = 'clear' | 'today'

type FooterAction = (kind: FooterButton) => void

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

// Shared dependencies threaded to the per-zone handlers below. Bundled into one
// object so each handler keeps a flat signature instead of a dozen parameters.
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

type GridActive = Extract<CalendarActive, { zone: 'grid' }>
type HeaderActive = Extract<CalendarActive, { zone: 'header' }>
type FooterActive = Extract<CalendarActive, { zone: 'footer' }>

function isArrowKey(key: string): boolean {
	return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
}

function handleClosedKey(e: KeyboardEvent<HTMLElement>, openCalendar: () => void) {
	if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
		e.preventDefault()

		openCalendar()
	}
}

// Keys that apply in any zone while the calendar is open. Returns true once a
// key is consumed so the caller can skip zone dispatch.
function handleOpenGlobalKey(e: KeyboardEvent<HTMLElement>, ctx: DatePickerKeyContext): boolean {
	if (e.key === 'Escape') {
		e.preventDefault()

		ctx.closeCalendar()

		return true
	}

	// Shift+ArrowUp jumps to the toolbar from anywhere; Shift+ArrowDown jumps to the footer.
	if (e.shiftKey && e.key === 'ArrowUp') {
		e.preventDefault()

		ctx.setActive({ zone: 'header', index: 1 })

		return true
	}

	if (e.shiftKey && e.key === 'ArrowDown') {
		e.preventDefault()

		if (ctx.footerButtons.length > 0) ctx.setActive({ zone: 'footer', index: 0 })

		return true
	}

	// APG date-grid: PageUp/PageDown move a month, Shift+Page a year. The
	// highlight materializes on the moved date when none exists yet, and the
	// calendar view re-anchors to follow it.
	if (e.key === 'PageUp' || e.key === 'PageDown') {
		e.preventDefault()

		const direction = e.key === 'PageUp' ? -1 : 1

		const next = ctx.moveGridMonths(e.shiftKey ? direction * 12 : direction)

		ctx.setActive({ zone: 'grid', date: next })

		return true
	}

	return false
}

// No highlight yet: the first arrow seeds the grid, Enter/Space selects the
// initial date, everything else is inert.
function handleNoActiveKey(e: KeyboardEvent<HTMLElement>, ctx: DatePickerKeyContext) {
	if (isArrowKey(e.key)) {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })

		return
	}

	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault()

		ctx.handleSelect(ctx.getInitialActiveDate())
	}
}

function handleGridKey(
	e: KeyboardEvent<HTMLElement>,
	active: GridActive,
	ctx: DatePickerKeyContext,
) {
	if (e.key === 'ArrowLeft') {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(-1) })

		return
	}

	if (e.key === 'ArrowRight') {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(1) })

		return
	}

	if (e.key === 'ArrowUp') {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(-7) })

		return
	}

	if (e.key === 'ArrowDown') {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.moveGridDate(7) })

		return
	}

	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault()

		ctx.handleSelect(active.date)
	}
}

function handleHeaderKey(
	e: KeyboardEvent<HTMLElement>,
	active: HeaderActive,
	ctx: DatePickerKeyContext,
) {
	if (e.key === 'ArrowLeft') {
		e.preventDefault()

		const nextIndex = active.index === 0 ? 2 : ((active.index - 1) as 0 | 1 | 2)

		ctx.setActive({ zone: 'header', index: nextIndex })

		return
	}

	if (e.key === 'ArrowRight') {
		e.preventDefault()

		const nextIndex = active.index === 2 ? 0 : ((active.index + 1) as 0 | 1 | 2)

		ctx.setActive({ zone: 'header', index: nextIndex })

		return
	}

	if (e.key === 'ArrowDown') {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })

		return
	}

	if (e.key === 'ArrowUp') {
		e.preventDefault()

		return
	}

	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault()

		if (active.index === 0) ctx.calendarRef.current?.prevMonth()
		else if (active.index === 1) ctx.calendarRef.current?.openPicker()
		else ctx.calendarRef.current?.nextMonth()
	}
}

function handleFooterKey(
	e: KeyboardEvent<HTMLElement>,
	active: FooterActive,
	ctx: DatePickerKeyContext,
) {
	const count = ctx.footerButtons.length

	// Left/Right wrap symmetrically; `(index + delta + count) % count` covers
	// both edges (0 → count-1 going left, count-1 → 0 going right).
	if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
		e.preventDefault()

		if (count === 0) return

		const delta = e.key === 'ArrowLeft' ? -1 : 1

		ctx.setActive({ zone: 'footer', index: (active.index + delta + count) % count })

		return
	}

	if (e.key === 'ArrowUp') {
		e.preventDefault()

		ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })

		return
	}

	if (e.key === 'ArrowDown') {
		e.preventDefault()

		return
	}

	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault()

		const kind = ctx.footerButtons[active.index]

		if (kind) ctx.onFooterActivate(kind)
	}
}

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
		(e: KeyboardEvent<HTMLElement>) => {
			if (disabled) return

			if (!open) {
				handleClosedKey(e, openCalendar)

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

			if (handleOpenGlobalKey(e, ctx)) return

			if (active === null) {
				handleNoActiveKey(e, ctx)

				return
			}

			if (active.zone === 'grid') {
				handleGridKey(e, active, ctx)

				return
			}

			if (active.zone === 'header') {
				handleHeaderKey(e, active, ctx)

				return
			}

			handleFooterKey(e, active, ctx)
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
