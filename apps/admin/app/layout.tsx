import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

const googleSans = localFont({
	src: [
		{ path: '../../../packages/sindri/src/fonts/google-sans-400.woff2', weight: '400' },
		{ path: '../../../packages/sindri/src/fonts/google-sans-500.woff2', weight: '500' },
		{ path: '../../../packages/sindri/src/fonts/google-sans-700.woff2', weight: '700' },
	],
	variable: '--font-sans',
})

export const metadata: Metadata = {
	title: 'Admin',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={googleSans.variable}>
			<body className="flex h-full justify-center bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
