'use client'

import type { AnchorHTMLAttributes, ComponentType, ReactNode, Ref } from 'react'
import { createContext } from '../core'

export type LinkProps = {
	href: string
	ref?: Ref<HTMLAnchorElement>
	children?: ReactNode
	className?: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

export type LinkComponent = ComponentType<LinkProps> | 'a'

export type LinkContextValue = {
	component: LinkComponent
}

/**
 * Link context — exposes the framework-specific link component an app has
 * registered (e.g. `next/link`). The user-facing `Link` and `LinkProvider`
 * components live in `components/link`; primitives consume the context to
 * render links without depending on the component layer.
 */
export const [LinkValueProvider, useLink] = createContext<LinkContextValue>('Link', {
	default: { component: 'a' },
})
