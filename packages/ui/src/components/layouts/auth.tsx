import type React from 'react'
import { cn } from '../../core'

export function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex min-h-dvh w-full flex-col p-2">
			<div
				className={cn(
					'flex grow items-center justify-center p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5',
					'dark:bg-zinc-950 dark:lg:ring-white/10',
				)}
			>
				{children}
			</div>
		</main>
	)
}
