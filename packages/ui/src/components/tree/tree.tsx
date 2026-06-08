'use client'

import { type FocusEvent, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { useDensity } from '../../primitives/density'
import { k, type TreeSize } from '../../recipes/kata/tree'
import type { AccessibleName } from '../../types'
import { TreeContext } from './context'
import { ITEM_SELECTOR } from './tree-constants'
import { ensureFirstItemActive, setActiveItem } from './tree-utilities'

export type TreeProps = AccessibleName & {
	/**
	 * Controls icon size and text size for all items.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: TreeSize
	/** Indent nested items so a child's chevron lines up under its parent's prefix slot. @default false */
	indent?: boolean
	children: ReactNode
	className?: string
}

/** Root of a `role="tree"` with roving-tabindex keyboard navigation — keeps the first item tabbable across open/close and filtering, and shares depth, size, and `indent` to nested items via context. Requires `aria-label`/`aria-labelledby` so the tree is never unnamed. */
export function Tree({ size, indent = false, children, className, ...labelProps }: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: ITEM_SELECTOR,
		orientation: 'vertical',
		focusOnEmpty: true,
	})

	const inherited = useDensity()

	const resolvedSize: TreeSize = size ?? inherited.size

	const rootContextValue = useMemo(
		() => ({ depth: 0, size: resolvedSize, indent }),
		[resolvedSize, indent],
	)

	// Make the first treeitem tabbable on mount and keep it that way as the
	// rendered set changes (open/close, search, expand-all). Subsequent focus
	// shifts are handled by the focus capture below.
	useEffect(() => {
		const container = ref.current

		if (!container) return

		ensureFirstItemActive(container)

		const observer = new MutationObserver(() => ensureFirstItemActive(container))

		observer.observe(container, { childList: true, subtree: true })

		return () => observer.disconnect()
	}, [])

	const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
		if (!(e.target instanceof Element)) return

		const target = e.target.closest<HTMLElement>(ITEM_SELECTOR)

		if (!target || !ref.current) return

		setActiveItem(ref.current, target)
	}

	return (
		<TreeContext value={rootContextValue}>
			<div
				ref={ref}
				role="tree"
				data-slot="tree"
				className={cn(k.base, className)}
				onKeyDown={handleKeyDown}
				onFocus={handleFocus}
				{...labelProps}
			>
				{children}
			</div>
		</TreeContext>
	)
}
