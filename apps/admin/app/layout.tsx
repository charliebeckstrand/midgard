import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { EventsScript } from 'ui/events'
import { UIDocument } from 'ui/providers/ui'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
	title: 'Admin',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<UIDocument
			head={<EventsScript />}
			bodyClassName="flex justify-center bg-white dark:bg-zinc-900 antialiased"
		>
			<Providers>{children}</Providers>
		</UIDocument>
	)
}
