'use client'

import type { AnchorHTMLAttributes, ComponentType, ReactNode, Ref } from 'react'
import { createContext } from '../../core'

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
 * registered (e.g. `next/link`). The user-facing `<Link>` lives in
 * `components/link`; the friendly `<LinkProvider>` lives in
 * `providers/link`. Primitives consume the context to render links without
 * depending on either.
 */
export const [LinkContext, useLink] = createContext<LinkContextValue>('Link', {
	default: { component: 'a' },
})
