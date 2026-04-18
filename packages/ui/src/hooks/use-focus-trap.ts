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

		// Prefer an explicitly marked element, else the first focusable child, else the container
		const preferred = container.querySelector<HTMLElement>('[data-autofocus]')

		const first = preferred ?? container.querySelector<HTMLElement>(focusableSelector)

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

			e.preventDefault()

			const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)

			let nextIndex: number

			if (e.shiftKey) {
				nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
			} else {
				nextIndex = currentIndex >= focusable.length - 1 ? 0 : currentIndex + 1
			}

			focusable[nextIndex]?.focus()
		}

		document.addEventListener('keydown', onKeyDown)

		return () => {
			document.removeEventListener('keydown', onKeyDown)

			previouslyFocused.current?.focus()
		}
	}, [active])

	return containerRef
}
