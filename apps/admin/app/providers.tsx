'use client'

import NextLink from 'next/link'
import type { ReactNode } from 'react'
import { AnnouncerProvider } from 'ui/providers/announcer'
import { LinkProvider } from 'ui/providers/link'

export function Providers({ children }: { children: ReactNode }) {
	return (
		<AnnouncerProvider>
			<LinkProvider component={NextLink}>{children}</LinkProvider>
		</AnnouncerProvider>
	)
}
