import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { appTitle } from 'shared/pages'
import { AppProviders } from 'shared/providers'

import './globals.css'

export const metadata: Metadata = {
	title: appTitle('Places'),
	description: 'The places you have been, on one map.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The server writes the stored settings of the reader on `<html>`
		// (`rootMarks`), so its classes differ from the markup of React. The
		// map fills the screen, so the page never scrolls: the body is the
		// frame every panel docks against.
		<html lang="en" className="h-full" suppressHydrationWarning>
			<body className="h-full overflow-hidden bg-white dark:bg-zinc-900 antialiased">
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	)
}
