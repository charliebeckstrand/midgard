import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { appTitle } from 'shared/pages'
import { AppProviders } from 'shared/providers'
import { ReaderOffsetCookie } from '@/components/reader-offset-cookie'

import './globals.css'

export const metadata: Metadata = {
	title: appTitle('Numbers'),
	description: 'Place 20 random numbers in ascending order.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The server writes the stored settings of the reader on `<html>`
		// (`rootMarks`), so its classes differ from the markup of React.
		<html lang="en" suppressHydrationWarning>
			{/* `--surface-fill` names the page ground, so the sticky bar of the number
			    paints the same color as the page. The body of the page is the box that
			    scrolls (`StackedLayoutBody`), so the document has the height of the
			    screen and does not scroll. */}
			<body className="h-dvh overflow-hidden print:h-auto print:overflow-visible bg-white text-zinc-950 antialiased [--surface-fill:var(--color-white)] dark:bg-zinc-900 dark:text-white dark:[--surface-fill:var(--color-zinc-900)]">
				<AppProviders>
					{children}

					{/* The server reads the day of the reader from the cookie (`readDailyStats`). */}
					<ReaderOffsetCookie />
				</AppProviders>
			</body>
		</html>
	)
}
