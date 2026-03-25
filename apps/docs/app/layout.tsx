import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
	title: 'Docs',
	description: 'Project documentation and knowledge base',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="h-full bg-white antialiased dark:bg-zinc-900">{children}</body>
		</html>
	)
}
