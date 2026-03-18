import type React from 'react'
import { cn } from '../../core'
import { omote } from '../../recipes'

export function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex min-h-dvh w-full flex-col p-2">
			<div
				className={cn(
					`flex grow items-center justify-center p-6 lg:p-10 dark:bg-zinc-950 ${omote.content}`,
				)}
			>
				{children}
			</div>
		</main>
	)
}
