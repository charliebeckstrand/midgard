import type React from 'react'
import { Button } from '../button'
import { Heading } from '../heading'
import { AuthLayout } from '../layouts/auth'

type ForgotPasswordPageProps = {
	onSubmit: React.FormEventHandler<HTMLFormElement>
	heading?: React.ReactNode
	serverError?: string
	submitting?: boolean
	children: React.ReactNode
	footer?: React.ReactNode
}

export function ForgotPasswordPage({
	onSubmit,
	heading,
	serverError,
	submitting,
	children,
	footer,
}: ForgotPasswordPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
				{heading ?? <Heading>Reset your password</Heading>}

				{serverError && <p className="text-sm text-red-500">{serverError}</p>}

				{children}

				<Button
					type="submit"
					className={`w-full ${submitting ? 'cursor-not-allowed pointer-events-none' : ''}`}
				>
					Send reset link
				</Button>

				{footer}
			</form>
		</AuthLayout>
	)
}
