'use client'

import { type ComponentProps, type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useA11yRoving } from '../../hooks'
import type { Mount } from '../../primitives/mount'
import { k, type scale } from '../../recipes/kata/tree'
import { Box } from '../../structure/box'
import type { AccessibleName } from '../../types'
import { TreeContext } from './context'
import { ROVING_ITEM_SELECTOR } from './tree-constants'
import { stampTreePositions } from './tree-item-children'

/** Props for {@link Tree}. Requires `aria-label` or `aria-labelledby`. */
export type TreeProps = AccessibleName &
	Omit<
		ComponentProps<'div'>,
		'className' | 'onKeyDown' | 'onFocus' | 'aria-label' | 'aria-labelledby'
	> & {
		/**
		 * The density step of the icons, the text, and the indent of all items.
		 * Omit it to take the step of the nearest density scope. A step makes the
		 * tree a density scope.
		 */
		size?: ScaleStep<typeof scale>
		/**
		 * Indent each nested group by the chevron width plus the row gap.
		 * @defaultValue true
		 */
		indent?: boolean
		/**
		 * What happens to a branch's children while it is closed.
		 *
		 * Under the default `active` a closed branch unmounts its children, so every
		 * expansion inside it is lost. Reopening shows them collapsed again, because
		 * an uncontrolled {@link TreeItem} keeps its own open state. `lazy` holds a
		 * branch from its first open, preserving that state and any scroll position
		 * or focus within it. `always` holds every branch from mount, which renders
		 * the whole tree up front — appropriate only for a bounded one.
		 *
		 * @defaultValue 'active'
		 */
		mount?: Mount
		children: ReactNode
		className?: string
	}

/** Root of a `role="tree"` with roving-tabindex keyboard navigation. It keeps the first item tabbable across open/close and filtering, and shares depth and `indent` to nested items via context. Requires `aria-label`/`aria-labelledby`. */
export function Tree({
	size,
	indent = true,
	mount = 'active',
	children,
	className,
	...labelProps
}: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const rovingKeyDown = useA11yRoving(ref, {
		itemSelector: ROVING_ITEM_SELECTOR,
		orientation: 'vertical',
		focusOnEmpty: true,
		// Roving owns the one tab stop. It seats the stop on the first treeitem, keeps
		// it there as the rendered set changes, and moves it to the item that takes
		// focus.
		manageTabIndex: true,
	})

	const rootContextValue = useMemo(() => ({ depth: 0, indent, mount }), [indent, mount])

	return (
		<TreeContext value={rootContextValue}>
			<Box
				{...labelProps}
				ref={ref}
				role="tree"
				data-slot="tree"
				density={size}
				className={cn(k.base, className)}
				onKeyDown={rovingKeyDown}
			>
				{stampTreePositions(children)}
			</Box>
		</TreeContext>
	)
}
