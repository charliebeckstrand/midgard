import type { ReactNode } from 'react'

type AuthLayoutProps = { children: ReactNode }

/**
 * Full-viewport layout that centres its content both axes — the frame for
 * sign-in, registration, and other unauthenticated single-card pages. Renders
 * a `<main>` filling the dynamic viewport height with a vertical gap between
 * stacked children.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<main className="flex min-h-dvh w-full flex-col items-center justify-center gap-6 p-6">
			{children}
		</main>
	)
}
