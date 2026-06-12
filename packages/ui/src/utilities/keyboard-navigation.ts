import type { Orientation } from '../types'

export type NavigationConfig = {
	/** Column count for 2D grid navigation. Omit for single-axis mode. */
	cols?: number
	/** Axis for 1D navigation. Ignored when `cols` is set. */
	orientation?: Orientation
}

/** Cross-axis arrow delta for an orientation: the pair the main axis doesn't use. */
export function crossAxisDelta(key: string, orientation: Orientation): number | null {
	const forward = orientation === 'vertical' ? 'ArrowRight' : 'ArrowDown'

	const back = orientation === 'vertical' ? 'ArrowLeft' : 'ArrowUp'

	return key === forward ? 1 : key === back ? -1 : null
}

/**
 * Next roving index for a key press, or null if unhandled.
 * -1 means nothing is active; a forward key lands on the first item, back on the last.
 * Indices wrap at both ends.
 */
export function nextIndexForKey(
	key: string,
	currentIndex: number,
	itemCount: number,
	config: NavigationConfig = {},
): number | null {
	if (itemCount === 0) return null

	if (key === 'Home') return 0

	if (key === 'End') return itemCount - 1

	return config.cols === undefined
		? nextIndexLinear(key, currentIndex, itemCount, config.orientation ?? 'vertical')
		: nextIndexGrid(key, currentIndex, itemCount, config.cols)
}

/** Wraps `index` into `[0, count)`. */
function wrap(index: number, count: number): number {
	return ((index % count) + count) % count
}

function nextIndexLinear(
	key: string,
	currentIndex: number,
	itemCount: number,
	orientation: Orientation,
): number | null {
	const delta =
		key === (orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight')
			? 1
			: key === (orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft')
				? -1
				: null

	if (delta === null) return null

	if (currentIndex === -1) return delta === 1 ? 0 : itemCount - 1

	return wrap(currentIndex + delta, itemCount)
}

function nextIndexGrid(
	key: string,
	currentIndex: number,
	itemCount: number,
	cols: number,
): number | null {
	if (currentIndex === -1) {
		if (key === 'ArrowRight' || key === 'ArrowDown') return 0

		if (key === 'ArrowLeft' || key === 'ArrowUp') return itemCount - 1

		return null
	}

	switch (key) {
		case 'ArrowRight':
			return wrap(currentIndex + 1, itemCount)
		case 'ArrowLeft':
			return wrap(currentIndex - 1, itemCount)
		case 'ArrowDown':
			return currentIndex + cols < itemCount ? currentIndex + cols : currentIndex % cols
		case 'ArrowUp': {
			if (currentIndex - cols >= 0) return currentIndex - cols

			// Wrap to the bottommost item in the same column. Columns past the
			// last row's fill land one row up.
			const col = currentIndex % cols

			const lastRowFill = itemCount % cols || cols

			const bottomRowStart = itemCount - lastRowFill

			return col < lastRowFill ? bottomRowStart + col : bottomRowStart - cols + col
		}
		default:
			return null
	}
}
