import type React from 'react'
import { Button } from '../components/button'
import { Heading } from '../components/heading'
import { AuthLayout } from '../layouts/auth'

export type RegisterPageProps = {
	onSubmit: React.ComponentProps<'form'>['onSubmit']
	heading?: React.ReactNode
	serverError?: string
	submitting?: boolean
	submitLabel?: string
	children: React.ReactNode
	footer?: React.ReactNode
}

export function RegisterPage({
	onSubmit,
	heading,
	serverError,
	submitting,
	submitLabel = 'Create account',
	children,
	footer,
}: RegisterPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
				{heading ?? <Heading>Create your account</Heading>}

				{serverError && <p className="text-red-600 dark:text-red-500">{serverError}</p>}

				{children}

				<Button type="submit" disabled={submitting}>
					{submitLabel}
				</Button>

				{footer}
			</form>
		</AuthLayout>
	)
}
