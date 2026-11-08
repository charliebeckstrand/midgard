import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Elections',
	description: 'Election results by state, district, and county.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The server writes the stored settings of the reader on `<html>`
		// (`rootMarks`), so its classes differ from the markup of React.
		<html lang="en" suppressHydrationWarning>
			{/* `--surface-fill` names the page ground, so the sticky grid header and the
			    chart strokes paint the same color as the page. */}
			<body className="min-h-dvh bg-white text-zinc-950 antialiased [--surface-fill:var(--color-white)] dark:bg-zinc-900 dark:text-white dark:[--surface-fill:var(--color-zinc-900)]">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
