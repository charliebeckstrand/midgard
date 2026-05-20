import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stat'

export type StatProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function Stat({ className, children, ...props }: StatProps) {
	return (
		<div data-slot="stat" className={cn(k(), className)} {...props}>
			{children}
		</div>
	)
}
