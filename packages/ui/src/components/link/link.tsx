'use client'

import { cn } from '../../core'
import { type LinkProps as PrimitiveLinkProps, useLink } from '../../primitives/link'
import { k, type LinkVariants } from '../../recipes/kata/link'

export type LinkProps = Omit<PrimitiveLinkProps, 'color'> & LinkVariants

/** Styled anchor that defers to the link component supplied via `useLink` — letting a router's `Link` drive navigation. */
export function Link({ href, color, underline, className, target, rel, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	// Opening a new tab without `rel` exposes the opener to reverse tabnabbing;
	// default the safe rel unless the caller sets their own.
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
