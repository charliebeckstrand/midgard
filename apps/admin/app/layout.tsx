import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ThemeScript } from 'ui/providers/theme'

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
		// ThemeScript toggles the root class pre-hydration; suppress the
		// resulting server/client class mismatch on <html> only.
		<html lang="en" suppressHydrationWarning>
			<body className="flex justify-center bg-white dark:bg-neutral-900 antialiased">
				<ThemeScript />
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
