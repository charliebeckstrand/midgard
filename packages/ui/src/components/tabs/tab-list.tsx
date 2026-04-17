'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { segmentControlVariants } from '../segment/variants'
import { useTabsContext } from './context'
import { k } from './variants'

export type TabListProps = React.ComponentPropsWithoutRef<'div'>

export function TabList({ className, children, ...props }: TabListProps) {
	const tabsCtx = useTabsContext()

	const isSegment = tabsCtx?.variant === 'segment'

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: 'button[data-slot="tab"]:not(:disabled)',
		orientation: 'horizontal',
	})

	return (
		<ActiveIndicatorScope>
			<div
				ref={ref}
				data-slot="tab-list"
				role="tablist"
				onKeyDown={handleKeyDown}
				className={cn(isSegment ? segmentControlVariants() : k.list, className)}
				{...props}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}
