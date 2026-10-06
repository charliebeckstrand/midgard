import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { UIDocument } from 'ui/providers/ui'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Admin',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<UIDocument bodyClassName="flex justify-center bg-white dark:bg-zinc-900 antialiased">
			<Providers>{children}</Providers>
		</UIDocument>
	)
}
