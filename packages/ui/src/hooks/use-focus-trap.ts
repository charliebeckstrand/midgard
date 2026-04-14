'use client'

import { useEffect, useRef } from 'react'

const focusableSelector = [
	'a[href]',
	'button:not(:disabled)',
	'input:not(:disabled)',
	'select:not(:disabled)',
	'textarea:not(:disabled)',
	'[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(active: boolean) {
	const containerRef = useRef<HTMLDivElement>(null)
	const previouslyFocused = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (!active) return

		const container = containerRef.current
		if (!container) return

		previouslyFocused.current = document.activeElement as HTMLElement

		// Focus the first focusable element inside the trap, or the container itself
		const first = container.querySelector<HTMLElement>(focusableSelector)
		if (first) {
			first.focus()
		} else {
			container.tabIndex = -1
			container.focus()
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== 'Tab' || !container) return

			const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
			if (focusable.length === 0) return

			const firstEl = focusable[0]
			const lastEl = focusable[focusable.length - 1]

			if (e.shiftKey) {
				if (document.activeElement === firstEl) {
					e.preventDefault()
					lastEl.focus()
				}
			} else {
				if (document.activeElement === lastEl) {
					e.preventDefault()
					firstEl.focus()
				}
			}
		}

		document.addEventListener('keydown', onKeyDown)

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			previouslyFocused.current?.focus()
		}
	}, [active])

	return containerRef
}
