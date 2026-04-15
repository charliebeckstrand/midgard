'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'

import { useRovingFocus } from '../../hooks/use-keyboard'

type ZoneRefs = {
	headerRef: RefObject<HTMLElement | null>
	gridRef: RefObject<HTMLElement | null>
	footerRef?: RefObject<HTMLElement | null>
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

	return buttons[buttons.length - 1]
}

function isTopRow(container: HTMLElement | null): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>('button') ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	return index >= 0 && index < 7
}

function isBottomRow(container: HTMLElement | null): boolean {
	const buttons = Array.from(container?.querySelectorAll<HTMLElement>('button') ?? [])

	const index = buttons.indexOf(document.activeElement as HTMLElement)

	if (index < 0) return false

	return index + 7 >= buttons.length
}

export function useCalendarZoneFocus({ headerRef, gridRef, footerRef }: ZoneRefs) {
	const headerRoving = useRovingFocus(headerRef, {
		itemSelector: 'button',
		orientation: 'horizontal',
	})

	const gridRoving = useRovingFocus(gridRef, {
		itemSelector: 'button',
		cols: 7,
	})

	const handleHeaderKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault()

				firstButton(gridRef.current)?.focus()

				return
			}

			headerRoving(e)
		},
		[gridRef, headerRoving],
	)

	const handleGridKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp' && isTopRow(gridRef.current)) {
				e.preventDefault()

				middleButton(headerRef.current)?.focus()

				return
			}

			if (e.key === 'ArrowDown' && isBottomRow(gridRef.current)) {
				const target = firstButton(footerRef?.current ?? null)

				if (target) {
					e.preventDefault()

					target.focus()

					return
				}
			}

			gridRoving(e)
		},
		[gridRef, headerRef, footerRef, gridRoving],
	)

	const handleFooterKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				e.preventDefault()

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

					next.focus()
				}
			}
		},
		[gridRef, footerRef],
	)

	return { handleHeaderKeyDown, handleGridKeyDown, handleFooterKeyDown }
}
