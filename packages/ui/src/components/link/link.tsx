'use client'

import { type LinkProps, useLink } from '../../primitives/link'

export type { LinkProps } from '../../primitives/link'

export function Link({ href, underline = true, ...props }: LinkProps & { underline?: boolean }) {
	const { component: LinkComponent } = useLink()

	return (
		<LinkComponent
			href={href}
			className={underline ? 'hover:underline underline-offset-4' : undefined}
			{...props}
		/>
	)
}
