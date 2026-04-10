import { type KeyboardEvent, useCallback } from 'react'

type UseInputKeyDownParams = {
	disabled: boolean
	open: boolean
	activeDate: Date | null
	openCalendar: () => void
	closeCalendar: () => void
	moveActiveDate: (delta: number) => void
	getInitialActiveDate: () => Date
	handleSelect: (date: Date) => void
}

export function useInputKeyDown({
	disabled,
	open,
	activeDate,
	openCalendar,
	closeCalendar,
	moveActiveDate,
	getInitialActiveDate,
	handleSelect,
}: UseInputKeyDownParams) {
	return useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			if (disabled) return

			if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
				e.preventDefault()

				openCalendar()

				return
			}

			if (!open) return

			if (e.key === 'Escape') {
				e.preventDefault()

				closeCalendar()

				return
			}

			if (e.key === 'ArrowRight') {
				e.preventDefault()

				moveActiveDate(1)

				return
			}

			if (e.key === 'ArrowLeft') {
				e.preventDefault()

				moveActiveDate(-1)

				return
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault()

				moveActiveDate(7)

				return
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault()

				moveActiveDate(-7)

				return
			}

			if (e.key === 'Enter' || e.key === ' ') {
				const next = activeDate ?? getInitialActiveDate()

				e.preventDefault()

				handleSelect(next)
			}
		},
		[
			disabled,
			open,
			activeDate,
			openCalendar,
			closeCalendar,
			moveActiveDate,
			getInitialActiveDate,
			handleSelect,
		],
	)
}
