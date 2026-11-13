import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { appTitle } from 'shared/pages'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: appTitle('Admin'),
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The server writes the stored settings of the reader on `<html>`
		// (`rootMarks`), so its classes differ from the markup of React.
		<html lang="en" suppressHydrationWarning>
			<body className="flex justify-center bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
