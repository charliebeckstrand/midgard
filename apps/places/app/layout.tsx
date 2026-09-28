import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { fontSans } from 'shared/fonts'
import { AppearanceScript } from 'ui/providers/appearance'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Places',
	description: 'The places you have been, on one map.',
}

export const viewport: Viewport = {
	maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={`h-full ${fontSans.variable}`} suppressHydrationWarning>
			<head>
				<AppearanceScript />
			</head>
			{/* The map fills the screen, so the page never scrolls: the body is the
			    frame every panel docks against. */}
			<body className="h-full overflow-hidden bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
