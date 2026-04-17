'use client'

import { useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { segmentControlVariants } from '../segment/variants'
import { useTabsContext } from './context'
import { k } from './variants'

const TAB_SELECTOR = 'button[data-slot="tab"]:not(:disabled)'

export type TabListProps = React.ComponentPropsWithoutRef<'div'>

export function TabList({ className, children, ...props }: TabListProps) {
	const tabsCtx = useTabsContext()

	const isSegment = tabsCtx?.variant === 'segment'

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: TAB_SELECTOR,
		orientation: 'horizontal',
	})

	useEffect(() => {
		const el = ref.current

		if (!el) return

		const ensureTabbable = () => {
			const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR))

			const first = tabs[0]

			if (!first) return

			if (!tabs.some((t) => t.tabIndex === 0)) first.tabIndex = 0
		}

		ensureTabbable()

		const observer = new MutationObserver(ensureTabbable)

		observer.observe(el, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['tabindex', 'disabled'],
		})

		return () => observer.disconnect()
	}, [])

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
