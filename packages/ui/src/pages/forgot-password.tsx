import type React from 'react'
import { Button } from '../components/button'
import { Heading } from '../components/heading'
import { AuthLayout } from '../layouts/auth'

export type ForgotPasswordPageProps = {
	onSubmit: React.ComponentProps<'form'>['onSubmit']
	heading?: React.ReactNode
	serverError?: string
	submitting?: boolean
	submitLabel?: string
	children: React.ReactNode
	footer?: React.ReactNode
}

export function ForgotPasswordPage({
	onSubmit,
	heading,
	serverError,
	submitting,
	submitLabel = 'Send reset link',
	children,
	footer,
}: ForgotPasswordPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
				{heading ?? <Heading>Reset your password</Heading>}

				{serverError && <p className="text-sm text-red-600">{serverError}</p>}

				{children}

				<Button type="submit" disabled={submitting}>
					{submitLabel}
				</Button>

				{footer}
			</form>
		</AuthLayout>
	)
}
