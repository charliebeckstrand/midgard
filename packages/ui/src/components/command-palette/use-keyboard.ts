'use client'

import type React from 'react'
import { useRef } from 'react'

const ITEM_SELECTOR = '[data-slot="command-palette-item"]:not([data-disabled])'

export function useKeyboard() {
	const listRef = useRef<HTMLDivElement>(null)

	function getItems(): HTMLElement[] {
		return Array.from(listRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
	}

	function setActive(index: number, scroll = true) {
		const items = getItems()

		if (!items.length) return

		const clamped = (index + items.length) % items.length

		for (const [i, el] of items.entries()) {
			if (i === clamped) el.setAttribute('data-active', '')
			else el.removeAttribute('data-active')
		}

		if (scroll) items[clamped]?.scrollIntoView({ block: 'nearest' })
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		const items = getItems()

		if (!items.length) return

		const activeIndex = items.findIndex((el) => el.dataset.active !== undefined)

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()

				setActive(activeIndex === -1 ? 0 : activeIndex + 1)

				break
			case 'ArrowUp':
				e.preventDefault()

				setActive(activeIndex === -1 ? items.length - 1 : activeIndex - 1)

				break
			case 'Home':
				e.preventDefault()

				setActive(0)

				break
			case 'End':
				e.preventDefault()

				setActive(items.length - 1)

				break
			case 'Enter': {
				if (activeIndex === -1) return

				e.preventDefault()

				items[activeIndex]?.click()

				break
			}
		}
	}

	return { listRef, onKeyDown }
}
