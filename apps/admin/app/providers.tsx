'use client'

import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { UIProvider } from 'ui/providers/ui'

/**
 * App-wide client providers. Mounts `UIProvider` wired to Next's `Link`.
 *
 * @remarks Top-level context per CONVENTIONS.md §6.1; rendered from the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
	return <UIProvider link={NextLink}>{children}</UIProvider>
}
