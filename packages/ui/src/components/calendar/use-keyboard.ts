import { type KeyboardEvent, type RefObject, useCallback } from 'react'

export function useKeyboard(gridRef: RefObject<HTMLElement | null>, cols = 3) {
	return useCallback(
		(e: KeyboardEvent) => {
			const grid = gridRef.current

			if (!grid) return

			const items = Array.from(grid.querySelectorAll<HTMLElement>('button'))

			const currentIndex = items.indexOf(document.activeElement as HTMLElement)

			if (currentIndex === -1) return

			let nextIndex: number | undefined

			switch (e.key) {
				case 'ArrowRight':
					nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
					break
				case 'ArrowLeft':
					nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
					break
				case 'ArrowDown':
					nextIndex = currentIndex + cols < items.length ? currentIndex + cols : currentIndex % cols
					break
				case 'ArrowUp':
					nextIndex =
						currentIndex - cols >= 0
							? currentIndex - cols
							: items.length - cols + (currentIndex % cols)
					break
				default:
					return
			}

			e.preventDefault()

			items[nextIndex]?.focus()
		},
		[gridRef, cols],
	)
}
