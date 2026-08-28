import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Recipes',
	description: 'What you cook, and what you plan to.',
}

export const viewport: Viewport = {
	maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="h-full">
			{/* Every surface docks against the viewport: the title row and the filter
			    row are fixed height, and the body between them is what scrolls. So the
			    page itself never does. */}
			<body className="h-full overflow-hidden bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
