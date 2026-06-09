'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

export type CollapseTriggerProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
	children: ReactNode | ((bag: { open: boolean }) => ReactNode)
}

export function CollapseTrigger({ className, children, onClick, ...props }: CollapseTriggerProps) {
	const { open, toggle, triggerProps } = useCollapseContext()

	const rendered = typeof children === 'function' ? children({ open }) : children

	return (
		<button
			type="button"
			// Consumer props first so they can't clobber the a11y id wiring
			// (aria-expanded/aria-controls), context-driven toggle, or data-slot below.
			{...props}
			data-slot="collapse-trigger"
			{...triggerProps}
			onClick={(e) => {
				toggle()
				onClick?.(e)
			}}
			className={cn(k.trigger, className)}
		>
			{rendered}
		</button>
	)
}
