'use client'

import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { UIProvider } from 'ui/providers/ui'

export function Providers({ children }: { children: ReactNode }) {
	return <UIProvider link={NextLink}>{children}</UIProvider>
}
