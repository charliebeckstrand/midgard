import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppearanceScript, FontPreload } from 'ui/providers/appearance'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Picks',
	description: 'Pick the winner of each NFL game, week by week.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<AppearanceScript />
				<FontPreload />
			</head>
			<body className="min-h-dvh bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
