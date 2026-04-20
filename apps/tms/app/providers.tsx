'use client'

import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { LinkProvider } from 'ui'

export function Providers({ children }: { children: ReactNode }) {
	return <LinkProvider component={NextLink}>{children}</LinkProvider>
}
