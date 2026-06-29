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
 * Sticky, opaque-surface, boundary-border, and boundary-shadow classes for a
 * pinned cell, or `''` when the column scrolls. Only the innermost column of each
 * frozen group — the one at the scroll-facing boundary — carries the edge border
 * (right for a left group, left for a right group) and the separating shadow; the
 * columns behind it get just the sticky surface. The engine's left/right sections
 * combine pinned and locked columns, so the boundary resolves across whichever mix
 * is frozen. `header` selects the header layer (above the sticky head).
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

	const atBoundary = side === 'left' ? pinning.isLastLeft(id) : pinning.isFirstRight(id)

	const sideBorder = atBoundary && (side === 'left' ? k.pinned.borderRight : k.pinned.borderLeft)

	const edge = atBoundary && (side === 'left' ? k.pinned.edgeLeft : k.pinned.edgeRight)

	return cn(options.header ? k.pinned.head : k.pinned.cell, sideBorder, edge)
}
