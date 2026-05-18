'use client'

import { type FocusEvent, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { useDensity } from '../../primitives/density'
import { k, type TreeSize } from '../../recipes/kata/tree'
import { TreeProvider } from './context'
import { ensureFirstItemActive, ITEM_SELECTOR, setActiveItem } from './tree-utilities'

export type TreeProps = {
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

export function Tree({ size, indent = false, children, className }: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(ref, {
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
		<TreeProvider value={rootContextValue}>
			<div
				ref={ref}
				role="tree"
				data-slot="tree"
				className={cn(k.base, className)}
				onKeyDown={handleKeyDown}
				onFocus={handleFocus}
			>
				{children}
			</div>
		</TreeProvider>
	)
}
