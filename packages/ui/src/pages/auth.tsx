import type React from 'react'
import { Center } from '../components/center'
import { Fieldset } from '../components/fieldset/component'
import { Text } from '../components/text'
import { cn } from '../core'
import { omote } from '../recipes'

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
		<Center className={cn('grow h-full p-6 lg:p-10', omote.surface, omote.content)}>
			<form onSubmit={onSubmit} className="grid gap-8 w-full lg:max-w-sm">
				{heading}

				{serverError && <Text variant="error">{serverError}</Text>}

				<Fieldset disabled={submitting} className="grid gap-8">
					{children}

					{actions}

					{footer}
				</Fieldset>
			</form>
		</Center>
	)
}
