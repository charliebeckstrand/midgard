'use client'

import { cn } from '../../core'
import { type LinkProps as PrimitiveLinkProps, useLink } from '../../primitives/link'
import { k, type LinkVariants } from '../../recipes/kata/link'

export type LinkProps = Omit<PrimitiveLinkProps, 'color'> & LinkVariants

/** Styled anchor that defers to the link component supplied via `useLink` — letting a router's `Link` drive navigation. */
export function Link({ href, color, underline, className, target, rel, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	// Defaults `rel="noopener noreferrer"` for `target="_blank"` links unless
	// the caller supplies their own `rel`.
	const resolvedRel = rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)

	return (
		<LinkComponent
			href={href}
			data-slot="link"
			target={target}
			rel={resolvedRel}
			className={cn(k({ color, underline }), className)}
			{...props}
		/>
	)
}
