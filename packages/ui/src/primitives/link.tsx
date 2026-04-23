'use client'

import {
	type AnchorHTMLAttributes,
	type ComponentType,
	type ReactNode,
	createContext as reactCreateContext,
	useContext,
	useMemo,
} from 'react'

export type LinkProps = {
	href: string
	children?: ReactNode
	className?: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

type LinkComponent = ComponentType<LinkProps> | 'a'

interface LinkContextValue {
	component: LinkComponent
}

const LinkContext = reactCreateContext<LinkContextValue>({ component: 'a' })

export function LinkProvider({
	component,
	children,
}: {
	component: LinkComponent
	children: ReactNode
}) {
	const value = useMemo<LinkContextValue>(() => ({ component }), [component])

	return <LinkContext.Provider value={value}>{children}</LinkContext.Provider>
}

export function useLink() {
	return useContext(LinkContext)
}

export function Link({ href, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return <LinkComponent href={href} {...props} />
}
