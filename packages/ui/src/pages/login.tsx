import type React from 'react'
import { Heading } from '../components/heading'
import { AuthLayout } from '../layouts/auth'

export type LoginPageProps = {
	onSubmit: React.ComponentProps<'form'>['onSubmit']
	heading?: React.ReactNode
	serverError?: string
	submit?: React.ReactNode
	children: React.ReactNode
	footer?: React.ReactNode
}

export function LoginPage({
	onSubmit,
	heading,
	serverError,
	submit,
	children,
	footer,
}: LoginPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
				{heading ?? <Heading>Sign in to your account</Heading>}

				{serverError && <p className="text-red-600 dark:text-red-500">{serverError}</p>}

				{children}

				{submit}

				{footer}
			</form>
		</AuthLayout>
	)
}
