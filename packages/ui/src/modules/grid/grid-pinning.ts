'use client'

import type { CSSProperties } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridColumnPinning } from './use-grid-table'

/**
 * Inline sticky offset for a pinned cell — `left` for a left-pinned column,
 * `right` for a right-pinned one, each summed from the engine — or `undefined`
 * when the column scrolls. Pairs with {@link pinnedClassName}, which carries the
 * `position: sticky` itself.
 *
 * @internal
 */
export function pinnedOffsetStyle(
	pinning: GridColumnPinning | null,
	id: string | number,
): CSSProperties | undefined {
	if (!pinning) return undefined

	const side = pinning.side(id)

	if (!side) return undefined

	return side === 'left' ? { left: pinning.leftOffset(id) } : { right: pinning.rightOffset(id) }
}

/**
 * Sticky, opaque-surface, and boundary-shadow classes for a pinned cell, or `''`
 * when the column scrolls. The innermost column of each frozen group gains the
 * separating shadow. `header` selects the header layer (above the sticky head).
 *
 * @internal
 */
export function pinnedClassName(
	pinning: GridColumnPinning | null,
	id: string | number,
	options: { header?: boolean } = {},
): string {
	if (!pinning) return ''

	const side = pinning.side(id)

	if (!side) return ''

	const edge =
		side === 'left'
			? pinning.isLastLeft(id) && k.pinned.edgeLeft
			: pinning.isFirstRight(id) && k.pinned.edgeRight

	return cn(options.header ? k.pinned.head : k.pinned.cell, edge)
}
