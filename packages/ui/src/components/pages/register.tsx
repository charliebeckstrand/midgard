import type React from 'react'
import { Button } from '../button'
import { Heading } from '../heading'
import { AuthLayout } from '../layouts/auth'

type RegisterPageProps = {
	onSubmit: React.FormEventHandler<HTMLFormElement>
	serverError?: string
	submitting?: boolean
	children: React.ReactNode
	footer?: React.ReactNode
}

export function RegisterPage({
	onSubmit,
	serverError,
	submitting,
	children,
	footer,
}: RegisterPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
				<Heading>Create your account</Heading>

				{serverError && <p className="text-sm text-red-500">{serverError}</p>}

				{children}

				<Button
					type="submit"
					className={`w-full ${submitting ? 'cursor-not-allowed pointer-events-none' : ''}`}
				>
					Create account
				</Button>

				{footer}
			</form>
		</AuthLayout>
	)
}
