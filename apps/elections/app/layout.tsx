import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { appTitle } from 'shared/pages'
import { APP_NAME } from '@/utilities/trail'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: appTitle(APP_NAME),
	description: 'Election results by state, district, and county.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// The server writes the stored settings of the reader on `<html>`
		// (`rootMarks`), so its classes differ from the markup of React.
		<html lang="en" suppressHydrationWarning>
			{/* `--surface-fill` names the page ground, so the sticky grid header and the
			    chart strokes paint the same color as the page. The body of each page is the
			    box that scrolls (`PageColumn`), so the document has the height of the screen
			    and does not scroll. After the keyboard of iOS closes, WebKit can keep the
			    page moved, and the reader can then scroll it under the footer. In print, the
			    document has the height of its content. */}
			<body className="h-dvh overflow-hidden print:h-auto print:overflow-visible bg-white text-zinc-950 antialiased [--surface-fill:var(--color-white)] dark:bg-zinc-900 dark:text-white dark:[--surface-fill:var(--color-zinc-900)]">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
