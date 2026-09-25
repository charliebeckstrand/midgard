import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AppearanceScript } from 'ui/providers/appearance'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Admin',
}

export const viewport: Viewport = {
	maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<AppearanceScript />
			</head>
			<body className="flex justify-center bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
