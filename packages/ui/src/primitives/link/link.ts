'use client'

import type { AnchorHTMLAttributes, ComponentType, Ref } from 'react'
import { createContext } from '../../core'

/** Props passed to the registered link component: a required `href` plus the standard anchor attributes. */
export type LinkProps = {
	href: string
	ref?: Ref<HTMLAnchorElement>
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

/** The framework link component an app registers, or the `'a'` fallback. */
export type LinkComponent = ComponentType<LinkProps> | 'a'

/** Value carried by `LinkContext`: the registered link component. */
export type LinkContextValue = {
	component: LinkComponent
}

/**
 * Link context: exposes the framework-specific link component an app
 * registers (e.g. `next/link`). The user-facing `<Link>` lives in
 * `components/link`; `<UIProvider>` (which registers it) lives in
 * `providers/ui`. Primitives consume the context to render links without
 * depending on either. Defaults to the plain `'a'` element outside any
 * provider.
 */
export const [LinkContext, useLink] = createContext<LinkContextValue>('Link', {
	default: { component: 'a' },
})
