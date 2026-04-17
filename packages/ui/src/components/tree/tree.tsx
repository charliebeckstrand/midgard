'use client'

import { type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import type { TreeColor } from '../../recipes/katachi/tree'
import { TreeProvider } from './context'
import { k } from './variants'

// ── Tree ───────────────────────────────────────────────

export type TreeProps = {
	children: ReactNode
	/** Default icon color. */
	color?: TreeColor
	className?: string
}

export function Tree({ children, color, className }: TreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
	})

	const rootContextValue = useMemo(() => ({ depth: 0, color }), [color])

	return (
		<TreeProvider value={rootContextValue}>
			<div
				ref={ref}
				role="tree"
				data-slot="tree"
				className={cn(k.base, className)}
				onKeyDown={handleKeyDown}
			>
				{children}
			</div>
		</TreeProvider>
	)
}
