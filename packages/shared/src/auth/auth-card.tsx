import type { ReactNode } from 'react'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'

type AuthCardProps = {
	/** The heading of the card. */
	title: ReactNode
	children: ReactNode
}

/**
 * The card of an auth page: the column of one width, one padding, and one gap,
 * under a centered heading.
 *
 * @internal
 * @remarks The verify-email page keeps its own column. It has a smaller gap and
 * centers all of its text.
 */
export function AuthCard({ title, children }: AuthCardProps) {
	return (
		<Stack gap="xl" className="w-full sm:max-w-sm p-6">
			<Heading className="text-center">{title}</Heading>

			{children}
		</Stack>
	)
}
