'use client'

import type React from 'react'
import { createContext as reactCreateContext, useContext } from 'react'

export type LinkProps = {
	href: string
	children?: React.ReactNode
	className?: string
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

type LinkComponent = React.ComponentType<LinkProps> | 'a'

interface LinkContextValue {
	component: LinkComponent
}

const LinkContext = reactCreateContext<LinkContextValue>({ component: 'a' })

export function LinkProvider({
	component,
	children,
}: {
	component: LinkComponent
	children: React.ReactNode
}) {
	return <LinkContext.Provider value={{ component }}>{children}</LinkContext.Provider>
}

export function useLink() {
	return useContext(LinkContext)
}

export function Link({ href, ...props }: LinkProps) {
	const { component: LinkComponent } = useLink()

	return <LinkComponent href={href} {...props} />
}
