'use client'

import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator, useCurrentContext } from '../../primitives'
import { segmentItemVariants } from '../segment/variants'
import { useTabsContext } from './context'
import { k, ks } from './variants'

export type TabProps = {
	value?: string
	current?: boolean
	/** Links this tab to its panel via aria-controls. */
	id?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'id' | 'value'>

export function Tab({
	value,
	current: currentProp,
	id,
	className,
	children,
	onClick,
	...props
}: TabProps) {
	const ctx = useCurrentContext()

	const tabsCtx = useTabsContext()

	const indicator = useActiveIndicator()

	const isSegment = tabsCtx?.variant === 'segment'

	const orientation = tabsCtx?.orientation ?? 'horizontal'

	const current = currentProp ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: MouseEvent<HTMLButtonElement>) {
		onClick?.(e)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return (
		<span className="group relative" {...indicator.tapHandlers}>
			<button
				data-slot="tab"
				data-current={current ? '' : undefined}
				role="tab"
				id={id}
				aria-selected={current ?? false}
				aria-controls={id ? `${id}-panel` : undefined}
				tabIndex={current ? 0 : -1}
				type="button"
				className={cn(
					isSegment ? segmentItemVariants() : k.tab({ orientation }),
					'relative z-1',
					className,
				)}
				onClick={handleClick}
				{...props}
			>
				{children}
			</button>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className={cn(isSegment ? ks.indicator : k.indicator({ orientation }))}
				/>
			)}
		</span>
	)
}
