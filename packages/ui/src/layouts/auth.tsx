import type React from 'react'
import { cn } from '../core'
import { Center } from '../components/center'
import { omote } from '../recipes'

export type AuthLayoutProps = { children: React.ReactNode }

export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<main className="flex min-h-dvh w-full flex-col p-2">
			<Center className={cn('grow p-6 lg:p-10', omote.surface, omote.content)}>
				{children}
			</Center>
		</main>
	)
}
