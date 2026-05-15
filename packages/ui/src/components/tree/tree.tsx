'use client'

import { type FocusEvent, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { useResolvedSize } from '../../primitives/concentric'
import { k, type TreeSize } from '../../recipes/kata/tree'
import { TreeProvider } from './context'

export type TreeProps = {
	/**
	 * Controls icon size and text size for all items.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
	 */
	size?: TreeSize
	/** Indent nested items so a child's chevron lines up under its parent's prefix slot. @default false */
	indent?: boolean
	children: ReactNode
	className?: string
}

const ITEM_SELECTOR = '[role="treeitem"]'

/** Standard ARIA roving-tabindex: only the active item is in the tab order. */
function setActiveItem(container: HTMLElement, target: HTMLElement) {
	const items = container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)

	for (const item of items) item.tabIndex = item === target ? 0 : -1
}

export function Tree({ size, indent = false, children, className }: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(ref, {
		itemSelector: ITEM_SELECTOR,
		orientation: 'vertical',
		focusOnEmpty: true,
	})

	const resolvedSize: TreeSize = useResolvedSize(size)

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

		const ensureFirstActive = () => {
			const items = Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR))

			if (items.length === 0) return

			if (items.some((i) => i.tabIndex === 0)) return

			items.forEach((item, i) => {
				item.tabIndex = i === 0 ? 0 : -1
			})
		}

		ensureFirstActive()

		const observer = new MutationObserver(ensureFirstActive)

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
