'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import { useRoving } from '../../hooks/use-keyboard'

type CalendarFocusOptions = {
	headerRef: RefObject<HTMLElement | null>
	gridRef: RefObject<HTMLElement | null>
	footerRef?: RefObject<HTMLElement | null>
	cols?: number
	stopPropagation?: boolean
}

function firstButton(container: HTMLElement | null): HTMLElement | null {
	return container?.querySelector<HTMLElement>('button') ?? null
}

function middleButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>('button') ?? [])

	return buttons[Math.floor(buttons.length / 2)] ?? null
}

function lastButton(container: HTMLElement | null): HTMLElement | null {
	const buttons = container?.querySelectorAll<HTMLElement>('button')

	if (!buttons?.length) return null

	return buttons.item(buttons.length - 1)
}

function isTopRow(container: HTMLElement | null, cols: number): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>('button') ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	return index >= 0 && index < cols
}

function isBottomRow(container: HTMLElement | null, cols: number): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>('button') ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	if (index < 0) return false

	return index + cols >= buttons.length
}

export function useCalendarFocus({
	headerRef,
	gridRef,
	footerRef,
	cols = 7,
	stopPropagation = false,
}: CalendarFocusOptions) {
	const headerRoving = useRoving(headerRef, {
		itemSelector: 'button',
		orientation: 'horizontal',
	})

	const gridRoving = useRoving(gridRef, {
		itemSelector: 'button',
		cols,
	})

	const handleHeaderKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault()

				if (stopPropagation) e.stopPropagation()

				firstButton(gridRef.current)?.focus()

				return
			}

			headerRoving(e)

			if (stopPropagation && e.defaultPrevented) e.stopPropagation()
		},
		[gridRef, headerRoving, stopPropagation],
	)

	const handleGridKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp' && isTopRow(gridRef.current, cols)) {
				e.preventDefault()

				if (stopPropagation) e.stopPropagation()

				middleButton(headerRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowDown' && isBottomRow(gridRef.current, cols)) {
				const target = firstButton(footerRef?.current ?? null)

				if (target) {
					e.preventDefault()

					if (stopPropagation) e.stopPropagation()

					target.focus()

					return
				}
			}

			gridRoving(e)

			if (stopPropagation && e.defaultPrevented) e.stopPropagation()
		},
		[gridRef, headerRef, footerRef, cols, gridRoving, stopPropagation],
	)

	const handleFooterKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault()

				if (stopPropagation) e.stopPropagation()

				lastButton(gridRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
				const buttons = Array.from(
					(footerRef?.current ?? null)?.querySelectorAll<HTMLElement>('button') ?? [],
				)

				const index = buttons.indexOf(document.activeElement as HTMLElement)

				if (index < 0) return

				const next =
					e.key === 'ArrowRight'
						? buttons[(index + 1) % buttons.length]
						: buttons[(index - 1 + buttons.length) % buttons.length]

				if (next) {
					e.preventDefault()

					if (stopPropagation) e.stopPropagation()

					next.focus()
				}
			}
		},
		[gridRef, footerRef, stopPropagation],
	)

	return { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown }
}
