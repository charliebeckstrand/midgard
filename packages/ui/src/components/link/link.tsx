'use client'

import { cn } from '../../core'
import { type LinkProps as PrimitiveLinkProps, useLink } from '../../primitives/link'
import { k, type LinkVariants } from '../../recipes/kata/link'

export type LinkProps = Omit<PrimitiveLinkProps, 'color'> & LinkVariants

/** Styled anchor that defers to the link component supplied via `useLink` — letting a router's `Link` drive navigation. */
export function Link({ href, color, underline, className, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return (
		<LinkComponent
			href={href}
			data-slot="link"
			className={cn(k({ color, underline }), className)}
			{...props}
		/>
	)
}
