'use client'

import { type ReactNode, useMemo } from 'react'
import {
	type LinkComponent,
	type LinkContextValue,
	type LinkProps,
	LinkValueProvider,
	useLink,
} from '../../primitives/link'

export type { LinkProps } from '../../primitives/link'
export { useLink } from '../../primitives/link'

export function LinkProvider({
	component,
	children,
}: {
	component: LinkComponent
	children: ReactNode
}) {
	const value = useMemo<LinkContextValue>(() => ({ component }), [component])

	return <LinkValueProvider value={value}>{children}</LinkValueProvider>
}

export function Link({ href, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return <LinkComponent href={href} {...props} />
}
