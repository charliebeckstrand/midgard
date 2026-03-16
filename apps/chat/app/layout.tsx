import type { Metadata } from 'next'
import { Google_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

const googleSans = Google_Sans({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
	title: 'Chat',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={googleSans.variable}>
			<body className="flex h-full bg-white dark:bg-zinc-900 antialiased">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
