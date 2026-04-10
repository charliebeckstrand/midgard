import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import type { CalendarActive, CalendarHandle } from '../calendar'

export type FooterButton = 'clear' | 'today'

type FooterAction = (kind: FooterButton) => void

type UseDatePickerKeyDownParams = {
	disabled: boolean
	open: boolean
	active: CalendarActive | null
	setActive: (next: CalendarActive | null) => void
	openCalendar: () => void
	closeCalendar: () => void
	moveGridDate: (delta: number) => Date
	getInitialActiveDate: () => Date
	handleSelect: (date: Date) => void
	calendarRef: RefObject<CalendarHandle | null>
	footerButtons: FooterButton[]
	onFooterActivate: FooterAction
}

export function useDatePickerKeyDown({
	disabled,
	open,
	active,
	setActive,
	openCalendar,
	closeCalendar,
	moveGridDate,
	getInitialActiveDate,
	handleSelect,
	calendarRef,
	footerButtons,
	onFooterActivate,
}: UseDatePickerKeyDownParams) {
	return useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			if (disabled) return

			if (!open) {
				if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
					e.preventDefault()

					openCalendar()
				}

				return
			}

			if (e.key === 'Escape') {
				e.preventDefault()

				closeCalendar()

				return
			}

			// Shift+ArrowUp jumps to the toolbar from anywhere; Shift+ArrowDown jumps to the footer.
			if (e.shiftKey && e.key === 'ArrowUp') {
				e.preventDefault()

				setActive({ zone: 'header', index: 1 })

				return
			}

			if (e.shiftKey && e.key === 'ArrowDown') {
				e.preventDefault()

				if (footerButtons.length > 0) {
					setActive({ zone: 'footer', index: 0 })
				}

				return
			}

			const isArrow =
				e.key === 'ArrowLeft' ||
				e.key === 'ArrowRight' ||
				e.key === 'ArrowUp' ||
				e.key === 'ArrowDown'

			// First arrow press after open: materialize on the grid.
			if (isArrow && active === null) {
				e.preventDefault()

				setActive({ zone: 'grid', date: getInitialActiveDate() })

				return
			}

			if (active === null) {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()

					handleSelect(getInitialActiveDate())
				}

				return
			}

			if (active.zone === 'grid') {
				if (e.key === 'ArrowLeft') {
					e.preventDefault()

					const next = moveGridDate(-1)

					setActive({ zone: 'grid', date: next })

					return
				}

				if (e.key === 'ArrowRight') {
					e.preventDefault()

					const next = moveGridDate(1)

					setActive({ zone: 'grid', date: next })

					return
				}

				if (e.key === 'ArrowUp') {
					e.preventDefault()

					const next = moveGridDate(-7)

					setActive({ zone: 'grid', date: next })

					return
				}

				if (e.key === 'ArrowDown') {
					e.preventDefault()

					const next = moveGridDate(7)

					setActive({ zone: 'grid', date: next })

					return
				}

				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()

					handleSelect(active.date)

					return
				}

				return
			}

			if (active.zone === 'header') {
				if (e.key === 'ArrowLeft') {
					e.preventDefault()

					const nextIndex = active.index === 0 ? 2 : ((active.index - 1) as 0 | 1 | 2)

					setActive({ zone: 'header', index: nextIndex })

					return
				}

				if (e.key === 'ArrowRight') {
					e.preventDefault()

					const nextIndex = active.index === 2 ? 0 : ((active.index + 1) as 0 | 1 | 2)

					setActive({ zone: 'header', index: nextIndex })

					return
				}

				if (e.key === 'ArrowDown') {
					e.preventDefault()

					setActive({ zone: 'grid', date: getInitialActiveDate() })

					return
				}

				if (e.key === 'ArrowUp') {
					e.preventDefault()

					return
				}

				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()

					if (active.index === 0) calendarRef.current?.prevMonth()
					else if (active.index === 1) calendarRef.current?.openPicker()
					else calendarRef.current?.nextMonth()

					return
				}

				return
			}

			// active.zone === 'footer'
			if (e.key === 'ArrowLeft') {
				e.preventDefault()

				if (footerButtons.length === 0) return

				const nextIndex = active.index === 0 ? footerButtons.length - 1 : active.index - 1

				setActive({ zone: 'footer', index: nextIndex })

				return
			}

			if (e.key === 'ArrowRight') {
				e.preventDefault()

				if (footerButtons.length === 0) return

				const nextIndex = active.index === footerButtons.length - 1 ? 0 : active.index + 1

				setActive({ zone: 'footer', index: nextIndex })

				return
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault()

				setActive({ zone: 'grid', date: getInitialActiveDate() })

				return
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault()

				return
			}

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()

				const kind = footerButtons[active.index]

				if (kind) onFooterActivate(kind)

				return
			}
		},
		[
			disabled,
			open,
			active,
			setActive,
			openCalendar,
			closeCalendar,
			moveGridDate,
			getInitialActiveDate,
			handleSelect,
			calendarRef,
			footerButtons,
			onFooterActivate,
		],
	)
}
