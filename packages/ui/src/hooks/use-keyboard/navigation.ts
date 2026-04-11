/**
 * Shared navigation primitives for the keyboard hooks in this module.
 *
 * These helpers are pure — no React, no DOM mutation — so they can be reused
 * by both the focus-based and virtual-focus variants without coupling them.
 */

export type Orientation = 'horizontal' | 'vertical'

export type RovingConfig = {
	/**
	 * Enable 2D grid navigation with this many columns. Up/Down move by a row;
	 * Left/Right move by one item. Omit for 1D navigation along a single axis.
	 */
	cols?: number
	/**
	 * Axis for 1D navigation. Ignored when `cols` is set.
	 * @default 'vertical'
	 */
	orientation?: Orientation
}

/**
 * Query all items matching `selector` inside `container`.
 */
export function queryItems<T extends HTMLElement = HTMLElement>(
	container: HTMLElement | null,
	selector: string,
): T[] {
	if (!container) return []

	return Array.from(container.querySelectorAll<T>(selector))
}

/**
 * Compute the next roving index for a key press, or `null` if the key is not
 * handled. Passing `currentIndex === -1` means "nothing is active yet"; in
 * that case, any forward key lands on the first item and any back key lands
 * on the last.
 *
 * Indices wrap at both ends. Grid mode assumes a rectangular layout
 * (`itemCount % cols === 0`); non-rectangular grids are not currently used
 * and would need a richer helper.
 */
export function nextIndexForKey(
	key: string,
	currentIndex: number,
	itemCount: number,
	config: RovingConfig = {},
): number | null {
	if (itemCount === 0) return null

	if (key === 'Home') return 0
	if (key === 'End') return itemCount - 1

	return config.cols === undefined
		? nextIndexLinear(key, currentIndex, itemCount, config.orientation ?? 'vertical')
		: nextIndexGrid(key, currentIndex, itemCount, config.cols)
}

function nextIndexLinear(
	key: string,
	currentIndex: number,
	itemCount: number,
	orientation: Orientation,
): number | null {
	const forward = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
	const back = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'

	if (key === forward) {
		if (currentIndex === -1) return 0

		return currentIndex === itemCount - 1 ? 0 : currentIndex + 1
	}

	if (key === back) {
		if (currentIndex === -1) return itemCount - 1

		return currentIndex === 0 ? itemCount - 1 : currentIndex - 1
	}

	return null
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
			return currentIndex < itemCount - 1 ? currentIndex + 1 : 0
		case 'ArrowLeft':
			return currentIndex > 0 ? currentIndex - 1 : itemCount - 1
		case 'ArrowDown':
			return currentIndex + cols < itemCount ? currentIndex + cols : currentIndex % cols
		case 'ArrowUp':
			return currentIndex - cols >= 0
				? currentIndex - cols
				: itemCount - cols + (currentIndex % cols)
		default:
			return null
	}
}
