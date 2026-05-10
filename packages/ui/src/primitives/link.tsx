'use client'

import {
	type AnchorHTMLAttributes,
	type ComponentType,
	type ReactNode,
	type Ref,
	useMemo,
} from 'react'
import { createContext } from '../core'

export type LinkProps = {
	href: string
	ref?: Ref<HTMLAnchorElement>
	children?: ReactNode
	className?: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

type LinkComponent = ComponentType<LinkProps> | 'a'

interface LinkContextValue {
	component: LinkComponent
}

const [LinkValueProvider, useLink] = createContext<LinkContextValue>('Link', {
	default: { component: 'a' },
})

export { useLink }

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
