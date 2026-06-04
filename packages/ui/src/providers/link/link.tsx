'use client'

import { type ReactNode, useMemo } from 'react'
// LinkContext is defined in the primitive, not locally, on purpose: the
// `polymorphic` primitive consumes `useLink`, so the context must live at the
// lowest layer that needs it. A local context here would force a primitive to
// import from the providers layer. This provider is a thin friendly wrapper.
import { type LinkComponent, LinkContext, type LinkContextValue } from '../../primitives/link'

type LinkProviderProps = {
	/**
	 * Framework-specific link component (e.g. `next/link`'s default export) that
	 * the library should render whenever it emits a link. Defaults to a plain
	 * `<a>` when no provider is mounted.
	 */
	component: LinkComponent
	children: ReactNode
}

/**
 * Registers a framework-specific link component at the app root so every
 * `<Link>` — and every library primitive that renders a link — routes through
 * it. Outside a provider, links fall back to a plain anchor.
 */
export function LinkProvider({ component, children }: LinkProviderProps) {
	const value = useMemo<LinkContextValue>(() => ({ component }), [component])

	return <LinkContext value={value}>{children}</LinkContext>
}
