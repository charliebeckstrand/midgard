import type React from 'react'

export type AuthLayoutProps = { children: React.ReactNode }

export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<main className="flex min-h-dvh w-full flex-col items-center justify-center p-2">
			{children}
		</main>
	)
}
