import type React from 'react'
import { Fieldset } from '../components/fieldset/component'
import { Text } from '../components/text'
import { AuthLayout } from '../layouts/auth'

export type AuthPageProps = {
	onSubmit: React.ComponentProps<'form'>['onSubmit']
	submitting?: boolean
	heading?: React.ReactNode
	serverError?: string
	children: React.ReactNode
	actions?: React.ReactNode
	footer?: React.ReactNode
}

export function AuthPage({
	onSubmit,
	submitting,
	heading,
	serverError,
	children,
	actions,
	footer,
}: AuthPageProps) {
	return (
		<AuthLayout>
			<form onSubmit={onSubmit} className="grid gap-8 w-full max-w-sm">
				{heading}

				{serverError && <Text variant="error">{serverError}</Text>}

				<Fieldset disabled={submitting} className="grid gap-8">
					{children}

					{actions}

					{footer}
				</Fieldset>
			</form>
		</AuthLayout>
	)
}
