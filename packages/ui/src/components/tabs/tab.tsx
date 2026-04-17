'use client'

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
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'id' | 'value'>

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

	const current = currentProp ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
		onClick?.(e)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return (
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
				isSegment ? segmentItemVariants() : k.tab,
				isSegment && current && ks.segmentCurrent,
				className,
			)}
			onClick={handleClick}
			{...indicator.tapHandlers}
			{...props}
		>
			<span className="relative z-10">{children}</span>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className={cn(isSegment ? ks.indicator : k.indicator)}
				/>
			)}
		</button>
	)
}
