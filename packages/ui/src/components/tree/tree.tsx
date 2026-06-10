'use client'

import {
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { useDensity } from '../../primitives/density'
import { k, type TreeSize } from '../../recipes/kata/tree'
import type { AccessibleName } from '../../types'
import { TreeContext } from './context'
import { ITEM_SELECTOR } from './tree-constants'
import { stampTreePositions } from './tree-item-children'
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

/** Root of a `role="tree"` with roving-tabindex keyboard navigation; keeps the first item tabbable across open/close and filtering, and shares depth, size, and `indent` to nested items via context. Requires `aria-label`/`aria-labelledby`. */
export function Tree({ size, indent = false, children, className, ...labelProps }: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const rovingKeyDown = useA11yRoving(ref, {
		itemSelector: ITEM_SELECTOR,
		orientation: 'vertical',
		focusOnEmpty: true,
	})

	// `focusOnEmpty` seeds the first item when no treeitem is active, but a
	// focused prefix/suffix control inside an item also reads as "empty"
	// (indexOf === -1). Roving runs only for the tree container itself or a
	// treeitem; arrows/Home/End on an inner control stay with the control.
	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const target = e.target

		if (
			target instanceof HTMLElement &&
			target !== e.currentTarget &&
			!target.matches(ITEM_SELECTOR)
		) {
			return
		}

		rovingKeyDown(e)
	}

	const inherited = useDensity()

	const resolvedSize: TreeSize = size ?? inherited.size

	const rootContextValue = useMemo(
		() => ({ depth: 0, size: resolvedSize, indent }),
		[resolvedSize, indent],
	)

	// Keeps the first treeitem tabbable as the rendered set changes (open/close,
	// search, expand-all). The focus capture below handles subsequent shifts.
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
				{stampTreePositions(children)}
			</div>
		</TreeContext>
	)
}
