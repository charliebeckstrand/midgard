import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Chat',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="flex h-full bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
