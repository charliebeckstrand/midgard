import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { UIDocument } from 'ui/providers/ui'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Places',
	description: 'The places you have been, on one map.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The map fills the screen, so the page never scrolls: the body is the
		// frame every panel docks against.
		<UIDocument
			className="h-full"
			bodyClassName="h-full overflow-hidden bg-white dark:bg-zinc-900 antialiased"
		>
			<Providers>{children}</Providers>
		</UIDocument>
	)
}
