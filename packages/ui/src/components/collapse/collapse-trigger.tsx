'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core/cn'
import { useCollapseContext } from './context'
import { k } from './variants'

export type CollapseTriggerProps = Omit<ComponentProps<'button'>, 'children'> & {
	children: ReactNode | ((bag: { open: boolean }) => ReactNode)
}

export function CollapseTrigger({ className, children, onClick, ...props }: CollapseTriggerProps) {
	const { open, toggle, triggerId, panelId } = useCollapseContext()

	const rendered = typeof children === 'function' ? children({ open }) : children

	return (
		<button
			type="button"
			id={triggerId}
			data-slot="collapse-trigger"
			aria-expanded={open}
			aria-controls={panelId}
			onClick={(e) => {
				toggle()
				onClick?.(e)
			}}
			className={cn(k.trigger, className)}
			{...props}
		>
			{rendered}
		</button>
	)
}
