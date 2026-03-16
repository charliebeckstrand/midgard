import type { Metadata } from 'next'
import { Google_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import './globals.css'

const googleSans = Google_Sans({
	subsets: ['latin'],
	variable: '--font-sans',
	weight: ['400', '500', '700'],
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
