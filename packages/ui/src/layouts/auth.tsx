import type { ReactNode } from 'react'
export type AuthLayoutProps = { children: ReactNode }

export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<main className="flex min-h-dvh w-full flex-col items-center justify-center gap-8 p-2">
			{children}
		</main>
	)
}
