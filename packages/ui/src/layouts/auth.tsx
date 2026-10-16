import type { ComponentProps } from 'react'
import { cn } from '../core'

/** Props for {@link AuthLayout}: the card or cards to center. The `<main>` takes the rest. */
export type AuthLayoutProps = ComponentProps<'main'>

/**
 * Full-viewport layout that centers its content both axes — the frame for
 * sign-in, registration, and other unauthenticated single-card pages. Renders
 * a `<main>` filling the dynamic viewport height with a vertical gap between
 * stacked children.
 */
export function AuthLayout({ className, ...props }: AuthLayoutProps) {
	return (
		<main
			data-slot="auth-layout"
			{...props}
			className={cn(
				'flex min-h-dvh w-full flex-col items-center justify-center gap-6 p-6',
				className,
			)}
		/>
	)
}
