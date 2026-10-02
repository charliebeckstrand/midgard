'use client'

import { cn } from '../../core'
import { type LinkProps as PrimitiveLinkProps, useLink } from '../../primitives/link'
import { resolveLinkRel } from '../../primitives/link/link-rel'
import { k, type LinkVariants } from '../../recipes/kata/link'

/** Props for {@link Link}: `color`/`underline` variants atop the injected link primitive's props. */
export type LinkProps = Omit<PrimitiveLinkProps, 'color'> & LinkVariants

/**
 * Styled anchor that defers to the link component supplied via `useLink`, letting a router's `Link` drive navigation.
 *
 * @remarks
 * `underline` draws the underline at rest, not only on hover. With the default
 * `color: current`, the link has the color of the text around it, so give a link
 * in running text `underline` or a `color`.
 */
export function Link({ href, color, underline, className, target, rel, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return (
		<LinkComponent
			href={href}
			data-slot="link"
			target={target}
			rel={resolveLinkRel(target, rel)}
			className={cn(k({ color, underline }), className)}
			{...props}
		/>
	)
}
