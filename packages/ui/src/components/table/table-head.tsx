import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from './variants'

export type TableHeadProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'thead'>, 'className'>

export function TableHead({ className, children, ...props }: TableHeadProps) {
	return (
		<thead className={cn(k.head, className)} {...props}>
			{children}
		</thead>
	)
}
