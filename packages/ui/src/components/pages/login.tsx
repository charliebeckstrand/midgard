import type React from 'react'
import { Button } from '../button'
import { Heading } from '../heading'
import { AuthLayout } from '../layouts/auth'

export type LoginPageProps = {
	onSubmit: React.ComponentProps<'form'>['onSubmit']
	heading?: React.ReactNode
	serverError?: string
	submitting?: boolean
	submitLabel?: string
	children: React.ReactNode
	footer?: React.ReactNode
}

export function LoginPage({
	onSubmit,
	heading,
	serverError,
	submitting,
	submitLabel = 'Sign in',
	children,
	footer,
}: LoginPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
				{heading ?? <Heading>Sign in to your account</Heading>}

				{serverError && <p className="text-sm text-red-600">{serverError}</p>}

				{children}

				<Button
					type="submit"
					className={`w-full ${submitting ? 'cursor-not-allowed pointer-events-none' : ''}`}
				>
					{submitLabel}
				</Button>

				{footer}
			</form>
		</AuthLayout>
	)
}
