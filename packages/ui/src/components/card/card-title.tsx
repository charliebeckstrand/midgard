import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { titleSize } from '../../recipes/kata/heading'
import { Heading } from '../heading'

export type CardTitleProps = {
	className?: string
	/** Step on the title type scale. Defaults to `md`; match a non-md `<Card size>` explicitly. */
	size?: Step
	/** Heading level of the rendered title. @default 3 */
	level?: 1 | 2 | 3 | 4 | 5 | 6
} & Omit<ComponentPropsWithoutRef<'h3'>, 'className'>

/** Static leaf: renders in React Server Components. */
export function CardTitle({ className, size, level = 3, children, ...props }: CardTitleProps) {
	return (
		<Heading
			level={level}
			data-slot="card-title"
			className={cn(titleSize(size ?? 'md'), className)}
			{...props}
		>
			{children}
		</Heading>
	)
}
