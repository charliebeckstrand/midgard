import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'TMS',
}

export const viewport: Viewport = {
	maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="flex h-full justify-center bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
