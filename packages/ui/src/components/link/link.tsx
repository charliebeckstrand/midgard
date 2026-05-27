'use client'

import { cn } from '../../core'
import { type LinkProps as PrimitiveLinkProps, useLink } from '../../primitives/link'
import { k, type LinkVariants } from '../../recipes/kata/link'

export type LinkProps = Omit<PrimitiveLinkProps, 'color'> &
	LinkVariants & {
		underline?: boolean
	}

export function Link({ href, color, underline = true, className, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return (
		<LinkComponent
			href={href}
			className={cn(k({ color }), underline && 'hover:underline underline-offset-4', className)}
			{...props}
		/>
	)
}
