import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { UIDocument } from 'ui/providers/ui'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Picks',
	description: 'Pick the winner of each NFL game, week by week.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<UIDocument bodyClassName="min-h-dvh bg-white text-zinc-950 antialiased dark:bg-zinc-900 dark:text-white">
			<Providers>{children}</Providers>
		</UIDocument>
	)
}
