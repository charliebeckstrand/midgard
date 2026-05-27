'use client'

import { cn } from '../../core'
import { type LinkProps as PrimitiveLinkProps, useLink } from '../../primitives/link'
import { k, type LinkVariants } from '../../recipes/kata/link'

export type LinkProps = Omit<PrimitiveLinkProps, 'color'> & LinkVariants

export function Link({ href, color, underline, className, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return <LinkComponent href={href} className={cn(k({ color, underline }), className)} {...props} />
}
