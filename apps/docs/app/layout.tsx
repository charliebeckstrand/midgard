import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'

import './globals.css'

const googleSans = localFont({
	src: [
		{ path: '../../../packages/sindri/src/fonts/google-sans-400.woff2', weight: '400' },
		{ path: '../../../packages/sindri/src/fonts/google-sans-500.woff2', weight: '500' },
		{ path: '../../../packages/sindri/src/fonts/google-sans-700.woff2', weight: '700' },
	],
	variable: '--font-sans',
})

export const metadata: Metadata = {
	title: 'Docs',
	description: 'Project documentation and knowledge base',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={googleSans.variable}>
			<body className="h-full bg-white antialiased dark:bg-zinc-900">{children}</body>
		</html>
	)
}
