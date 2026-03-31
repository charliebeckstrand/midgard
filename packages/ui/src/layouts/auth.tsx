import type React from 'react'
import { cn } from '../core'
import { omote } from '../recipes'

export type AuthLayoutProps = { children: React.ReactNode }

export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<main className="flex min-h-dvh w-full flex-col p-2">
			<div
				className={cn(
					'flex grow items-center justify-center p-6 lg:p-10 bg-white dark:bg-zinc-900',
					omote.content,
				)}
			>
				{children}
			</div>
		</main>
	)
}
