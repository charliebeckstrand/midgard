import type { AnchorHTMLAttributes } from 'react'

import { linkVariants } from './variants.js'

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {}

export function Link({ className, children, ...rest }: LinkProps) {
	return (
		<a className={linkVariants({ className })} {...rest}>
			{children}
		</a>
	)
}
