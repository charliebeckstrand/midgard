import type { ReactNode } from 'react'
import { Card, CardHeader, CardTitle } from 'ui/card'

/**
 * The card of the bans, with its title. The client page and the loading page
 * give the same card, so the page keeps its shape when the bans land.
 *
 * @remarks
 * Static: renders in React Server Components and in client pages.
 */
export function BansSection({ children }: { children: ReactNode }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bans</CardTitle>
			</CardHeader>
			{children}
		</Card>
	)
}

/**
 * The card of the threats, with its title. See {@link BansSection}.
 *
 * @remarks
 * Static: renders in React Server Components and in client pages.
 */
export function ThreatsSection({ children }: { children: ReactNode }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Threats</CardTitle>
			</CardHeader>
			{children}
		</Card>
	)
}
